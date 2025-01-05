import { ASTNode } from "./ast.js";
import { PScriptError } from "./errors.js";
import { tokenizePython } from "./lexer.js";
import { TokenStream } from "./token-stream.js";

/* =========================================
      ПАРСЕР P Y T H O N
   ========================================= */

/**
 * Ожидает один или несколько токенов NEWLINE, затем INDENT.
 * @param {TokenStream} stream - Текущий поток токенов.
 */
function expectNewlineAndIndent(stream) {
  stream.expect("NEWLINE");
  // Пропускаем дополнительные NEWLINE токены (например, пустые строки)
  while (stream.current() && stream.current().type === "NEWLINE") {
    stream.next();
  }
  stream.expect("INDENT");
}

/**
 * Пропускает все подряд идущие токены NEWLINE.
 * @param {TokenStream} stream - Текущий поток токенов.
 */
function skipNewlines(stream) {
  while (stream.current() && stream.current().type === "NEWLINE") {
    stream.next();
  }
}

//
function parsePower(stream) {
  // обрабатывает возведение в степень (**)
  let base = parseFactor(stream);
  while (
    stream.current() &&
    stream.current().type === "OP" &&
    stream.current().value === "**"
  ) {
    stream.next(); // пропускаем **
    const exponent = parsePower(stream); // правоассоциативность
    base = new ASTNode("BinOp", { op: "**", left: base, right: exponent });
  }
  return base;
}

// parseExpr разберёт суммы и разности
function parseExpr(stream) {
  // обрабатывает + и -
  let left = parseTerm(stream);
  while (true) {
    const cur = stream.current();
    if (!cur || cur.type !== "OP") break;
    if (cur.value === "+" || cur.value === "-") {
      const op = cur.value;
      stream.next();
      const right = parseTerm(stream);
      left = new ASTNode("BinOp", { op, left, right });
    } else {
      break;
    }
  }
  return left;
}

function parseComparison(stream) {
  // Предположим, parseExpr обрабатывает +, -, *, /, ...
  let left = parseExpr(stream);
  while (true) {
    const cur = stream.current();
    if (!cur || cur.type !== "OP") break;

    // Список операторов сравнения
    if (["<", ">", "<=", ">=", "==", "!="].includes(cur.value)) {
      const op = cur.value;
      stream.next(); // пропускаем оператор
      const right = parseExpr(stream);
      left = new ASTNode("BinOp", { op, left, right });
    } else {
      break;
    }
  }
  return left;
}

// parseTerm разберёт умножение, деление, //, %
function parseTerm(stream) {
  // обрабатывает * / // %
  let left = parsePower(stream);
  while (true) {
    const cur = stream.current();
    if (!cur || cur.type !== "OP") break;
    if (["*", "/", "//", "%"].includes(cur.value)) {
      const op = cur.value;
      stream.next();
      const right = parsePower(stream);
      left = new ASTNode("BinOp", { op, left, right });
    } else {
      break;
    }
  }
  return left;
}

function parseListLiteral(stream) {
  // Предполагаем, что текущий токен — это '['
  stream.next(); // пропускаем '['

  const elements = [];

  // Читаем элементы (выражения), разделённые запятыми, до ']'
  while (
    stream.current() &&
    !(stream.current().type === "OP" && stream.current().value === "]")
  ) {
    // Каждый элемент — полноценное выражение, например parseMembership
    const elem = parsePythonExpression(stream);
    elements.push(elem);

    // Если видим ',', пропускаем
    if (
      stream.current() &&
      stream.current().type === "OP" &&
      stream.current().value === ","
    ) {
      stream.next(); // пропускаем запятую
    } else {
      break;
    }
  }

  // Ожидаем закрывающую ']'
  stream.expect("OP", "]");

  // Создаём AST-узел, например "ListLiteral"
  return new ASTNode("ListLiteral", { elements });
}

function parseFStringInnerExpression(exprContent, fileName, line, col) {
  // Лексируем exprContent (самостоятельно)
  const tokens = tokenizePython(exprContent, fileName);
  // tokenizePython - ваш лексер
  // затем делаем новый TokenStream
  const stream = new TokenStream(tokens, fileName);
  // и вызываем parsePythonExpression (или parseMembership)
  let expr = parsePythonExpression(stream);

  if (stream.current()) {
    // Если после разбора что-то осталось - возможно ошибка
    // (или в реальности можно склеивать, но упрощённо)
    throw new PScriptError(
      "Лишние символы внутри f-строки после выражения",
      fileName,
      line,
      col
    );
  }

  return expr;
}

function parseFStringContent(raw, fileName, line, col) {
  // Разделим по '{' и '}'
  // Надо аккуратно поддерживать вложенные фигурные скобки и экранирование, но упрощаем.
  // Самый простой подход: split по '{' -> потом внутри split по '}', etc.
  // Внимание: это "наивно" и не обрабатывает случаи {{ или }}.

  let segments = [];
  let currentText = "";
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === "{") {
      // Сохраняем накопленный текст как segment
      if (currentText.length > 0) {
        segments.push({ type: "text", value: currentText });
        currentText = "";
      }

      // ищем закрывающую '}'
      let j = raw.indexOf("}", i + 1);
      if (j === -1) {
        throw new PScriptError(
          "Не найдена закрывающая '}' в f-строке",
          fileName,
          line,
          col
        );
      }
      // Вытаскиваем содержимое между { ... }
      let exprContent = raw.slice(i + 1, j).trim();
      // Парсим это как python-выражение:
      let exprAst = parseFStringInnerExpression(
        exprContent,
        fileName,
        line,
        col
      );

      segments.push({ type: "expr", expr: exprAst });

      i = j + 1; // пропускаем '}'
    } else {
      // Просто символ текста
      currentText += raw[i];
      i++;
    }
  }

  // если остался хвост текста
  if (currentText.length > 0) {
    segments.push({ type: "text", value: currentText });
  }

  return new ASTNode("FStringLiteral", { segments });
}

// Обрабатывает (expr), NUMBER, STRING, IDENTIFIER, [list-literal], {dict?}, и т.д.// обрабатывает числа, идентификаторы, скобки (…)
function parseAtom(stream) {
  const token = stream.current();
  if (!token) {
    throw new PScriptError(
      "Ожидалось выражение, но достигнут конец",
      stream.fileName,
      0,
      0
    );
  }

  // Проверяем, не является ли текущий токен INDENT или DEDENT
  if (token.type === "INDENT" || token.type === "DEDENT") {
    throw new PScriptError(
      `Непредвиденный ${token.type}`,
      stream.fileName,
      token.line,
      token.col
    );
  }

  // ( expr ) ?
  if (token.type === "OP" && token.value === "(") {
    stream.next();
    const expr = parseExpr(stream);
    if (!stream.current() || stream.current().value !== ")") {
      throw new PScriptError(
        "Ожидалась ')'",
        stream.fileName,
        token.line,
        token.col
      );
    }
    stream.next(); // пропускаем ')'
    return expr;
  }

  // Objects
  if (token.type === "OP" && token.value === "{") {
    return parseDictLiteral(stream);
  }

  // F-string
  if (token.type === "FSTRING") {
    stream.next();
    const raw = token.value; // Например: Hello {name}, you have {count} messages.
    return parseFStringContent(raw, stream.fileName, token.line, token.col);
  }

  // NUMBER ?
  if (token.type === "NUMBER") {
    stream.next();
    return new ASTNode("NumberLiteral", { value: token.value });
  }

  // STRING ?
  if (token.type === "STRING") {
    stream.next();
    return new ASTNode("StringLiteral", { value: token.value });
  }

  // IDENTIFIER ?
  if (token.type === "IDENTIFIER") {
    stream.next();
    let node = new ASTNode("Variable", { name: token.value });
    // Проверим, нет ли после идентификатора конструкции [ ... ]
    while (
      stream.current() &&
      stream.current().type === "OP" &&
      stream.current().value === "["
    ) {
      stream.next(); // пропускаем '['
      const indexExpr = parseExpr(stream);
      stream.expect("OP", "]");
      // Заворачиваем в ASTNode("IndexAccess", { object: node, index: indexExpr })
      node = new ASTNode("IndexAccess", {
        object: node,
        index: indexExpr,
      });
    }

    return node;
  }

  // [ expr ]
  if (token.type === "OP" && token.value === "[") {
    return parseListLiteral(stream);
  }

  // Если хотим поддержать унарный минус:  -(expr)
  // if (token.type === "OP" && token.value === '-') { ... }

  throw new PScriptError(
    `Непонятный фактор: ${token.type} ${token.value}`,
    stream.fileName,
    token.line,
    token.col
  );
}

function parseCallArguments(stream, calleeNode) {
  // парсим скобки ( ... )
  // допустим, уже знаем, что cur.value === '('
  stream.expect("OP", "(");

  const args = [];
  while (
    stream.current() &&
    !(stream.current().type === "OP" && stream.current().value === ")")
  ) {
    const argExpr = parseMembership(stream);
    args.push(argExpr);
    if (
      stream.current() &&
      stream.current().type === "OP" &&
      stream.current().value === ","
    ) {
      stream.next(); // пропустить ','
    } else {
      break;
    }
  }
  stream.expect("OP", ")");

  return new ASTNode("CallExpression", {
    callee: calleeNode,
    args,
  });
}

// parseFactor парсит числа, идентификаторы, скобки (…)
function parseFactor(stream) {
  // 1) Парсим базовый атом (число, строка, идентификатор, (expr), список [...], etc.)
  let node = parseAtom(stream);

  // 2) Теперь, возможно, идёт несколько «постфиксов», наподобие .attr, [expr], (call_args)
  while (true) {
    const cur = stream.current();
    if (!cur || cur.type !== "OP") {
      break;
    }

    if (cur.value === ".") {
      // доступ к атрибуту: obj.attr
      stream.next(); // пропустить '.'
      const attrToken = stream.current();
      if (!attrToken || attrToken.type !== "IDENTIFIER") {
        throw new PScriptError(
          `Ожидался идентификатор после '.'`,
          stream.fileName,
          attrToken?.line || 0,
          attrToken?.col || 0
        );
      }
      stream.next(); // пропустить имя атрибута

      // создаём AST-узел AttributeAccess
      node = new ASTNode("AttributeAccess", {
        object: node,
        attribute: attrToken.value,
      });

      // Может ли сразу после attr идти '(' ? — тогда это вызов метода.
      // Например, arr.append(4). Если хотите поддержать вызовы, делаете ещё проверку:
      if (
        stream.current() &&
        stream.current().type === "OP" &&
        stream.current().value === "("
      ) {
        node = parseCallArguments(stream, node);
        // parseCallArguments — ваша функция, создающая AST-узел 'CallExpression', где callee = node
      }
    } else if (cur.value === "[") {
      // Индексация: obj[expr]
      stream.next(); // пропустить '['
      const indexExpr = parseExpr(stream);
      stream.expect("OP", "]");
      node = new ASTNode("IndexAccess", { object: node, index: indexExpr });
    } else if (cur.value === "(") {
      // Вызов функции (или метода) без точки: foo(...)
      // Но если node === Variable('foo'), то это вызов функции foo(...)
      // Если node === AttributeAccess(...), то arr.append(...) и т.д.
      node = parseCallArguments(stream, node);
    } else {
      break; // никаких постфиксов
    }
  }

  return node;
}

function parseMembership(stream) {
  // Предположим, у нас есть parseComparison, обрабатывающая <, >, ==, !=, ...
  let left = parseComparison(stream);

  while (true) {
    const cur = stream.current();
    if (!cur) break;

    // Проверяем, не встретили ли мы ключевое слово 'in'
    if (cur.type === "KEYWORD" && cur.value === "in") {
      // membership: left in right
      stream.next(); // пропускаем 'in'
      const right = parseComparison(stream);
      left = new ASTNode("MembershipTest", { op: "in", left, right });
    }
    // Может быть 'not in'
    else if (
      cur.type === "KEYWORD" &&
      cur.value === "not" &&
      stream.peek(1) &&
      stream.peek(1).type === "KEYWORD" &&
      stream.peek(1).value === "in"
    ) {
      // left not in right
      stream.next(); // пропускаем 'not'
      stream.next(); // пропускаем 'in'
      const right = parseComparison(stream);
      left = new ASTNode("MembershipTest", { op: "not in", left, right });
    } else {
      // никаких 'in' / 'not in' — выходим
      break;
    }
  }

  return left;
}

function parseDictLiteral(stream) {
  // Уже знаем, что текущий токен = '{'
  stream.next(); // пропускаем '{'

  const pairs = [];

  // Читаем пары вида key : value
  while (
    stream.current() &&
    !(stream.current().type === "OP" && stream.current().value === "}")
  ) {
    // Ключ может быть STRING или IDENTIFIER (или другое выражение).
    // Упрощённо предположим STRING или IDENTIFIER:
    const keyToken = stream.current();
    if (keyToken.type !== "STRING" && keyToken.type !== "IDENTIFIER") {
      throw new PScriptError(
        `Ожидался ключ словаря (STRING или IDENTIFIER) перед двоеточием`,
        stream.fileName,
        keyToken.line,
        keyToken.col
      );
    }
    stream.next(); // пропускаем ключ

    // Ожидаем двоеточие
    stream.expect("OP", ":");

    // Парсим value как полноценное выражение
    const valueExpr = parsePythonExpression(stream);
    // (или parseMembership, parseComparison, ... если у вас есть единый верхний парсер)

    pairs.push({
      key: keyToken.value,
      value: valueExpr,
    });

    // Может идти запятая
    if (
      stream.current() &&
      stream.current().type === "OP" &&
      stream.current().value === ","
    ) {
      stream.next(); // пропускаем ','
    } else {
      break;
    }
  }

  // Закрывающая '}'
  stream.expect("OP", "}");

  return new ASTNode("DictLiteral", { pairs });
}

function parseAssignment(stream) {
  // Разбираем "левое" выражение (которое может быть self.name, arr[0], просто x, и т.д.)
  let left = parseMembership(stream); // или parseExpr, parseMembership — на ваше усмотрение

  // Если следующий токен — "=", значит это присваивание
  const cur = stream.current();
  if (cur && cur.type === "OP" && cur.value === "=") {
    const eqToken = cur;
    stream.next(); // пропускаем "="

    // Правую часть тоже разбираем как присваивание, чтобы поддерживать цепочки: x = y = 123
    let right = parseAssignment(stream);

    return new ASTNode("AssignStatement", {
      left,
      right,
      loc: { line: eqToken.line, col: eqToken.col },
    });
  }

  // иначе это не присваивание, а просто выражение
  return left;
}

export function parsePythonTokens(tokens, fileName = "<anonymous>") {
  const stream = new TokenStream(tokens, fileName);
  const body = [];

  while (stream.current()) {
    // Пропускаем лишние NEWLINE токены
    while (stream.current() && stream.current().type === "NEWLINE") {
      stream.next();
    }

    if (stream.isAtEnd()) break;

    body.push(parsePythonStatement(stream));
  }

  return new ASTNode("Module", { body });
}

function parsePythonStatement(stream) {
  const token = stream.current();
  if (!token) return null;

  // Проверяем KEYWORD
  if (token.type === "KEYWORD") {
    switch (token.value) {
      case "import":
        return parsePythonImport(stream);
      case "from":
        return parsePythonFromImport(stream);
      case "class":
        return parsePythonClass(stream);
      case "def":
        return parsePythonFunction(stream);
      case "if":
        return parsePythonIf(stream);
      case "for":
        return parsePythonFor(stream);
      case "while":
        return parsePythonWhile(stream);
      case "try":
        return parsePythonTry(stream);
      case "return":
        return parsePythonReturn(stream);
      default:
        // Может быть print, etc.
        return parsePythonExpression(stream);
    }
  } else {
    // Возможно, это выражение (например, присваивание)
    return parsePythonExpression(stream);
  }
}

/* ---- Примеры разборов инструкций ---- */

function parsePythonImport(stream) {
  // import <IDENTIFIER> [as <IDENTIFIER>] (без запятых для упрощения)
  const start = stream.expect("KEYWORD", "import");
  const moduleName = stream.expect("IDENTIFIER");
  let aliasNode = null;
  if (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "as"
  ) {
    stream.next(); // пропустить 'as'
    const alias = stream.expect("IDENTIFIER");
    aliasNode = alias.value;
  }
  return new ASTNode("ImportStatement", {
    moduleName: moduleName.value,
    alias: aliasNode,
    loc: { line: start.line, col: start.col },
  });
}

function parsePythonFromImport(stream) {
  // from <IDENTIFIER> import <IDENTIFIER> [as <IDENTIFIER>]
  const start = stream.expect("KEYWORD", "from");
  const moduleName = stream.expect("IDENTIFIER");
  stream.expect("KEYWORD", "import");
  const importedName = stream.expect("IDENTIFIER");
  let aliasNode = null;
  if (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "as"
  ) {
    stream.next(); // пропустить 'as'
    const alias = stream.expect("IDENTIFIER");
    aliasNode = alias.value;
  }
  return new ASTNode("FromImportStatement", {
    moduleName: moduleName.value,
    importedName: importedName.value,
    alias: aliasNode,
    loc: { line: start.line, col: start.col },
  });
}

function parsePythonClass(stream) {
  const start = stream.expect("KEYWORD", "class");
  const className = stream.expect("IDENTIFIER");
  // Упрощённо: не обрабатываем наследование (например, class Person(Base): ...)
  stream.expect("OP", ":");

  expectNewlineAndIndent(stream);

  const body = [];
  while (stream.current() && stream.current().type !== "DEDENT") {
    skipNewlines(stream); // Пропускаем любые NEWLINE перед инструкцией
    if (stream.current() && stream.current().type !== "DEDENT") {
      body.push(parsePythonStatement(stream));
    }
  }
  stream.expect("DEDENT"); // Завершение блока класса

  return new ASTNode("ClassDef", {
    name: className.value,
    body,
    loc: { line: start.line, col: start.col },
  });
}

function parsePythonFunction(stream) {
  const start = stream.expect("KEYWORD", "def");
  const funcName = stream.expect("IDENTIFIER");
  stream.expect("OP", "(");

  // Парсинг аргументов (упрощённо)
  const args = [];
  if (stream.current() && stream.current().type === "IDENTIFIER") {
    const firstArg = stream.current();
    stream.next();
    if (firstArg.value !== "self") {
      // исключаем 'self'
      args.push(firstArg.value);
    }
    while (stream.current() && stream.current().value === ",") {
      stream.next(); // пропускаем запятую
      const nxt = stream.expect("IDENTIFIER");
      if (nxt.value !== "self") {
        // исключаем 'self'
        args.push(nxt.value);
      }
    }
  }
  stream.expect("OP", ")");
  stream.expect("OP", ":");

  expectNewlineAndIndent(stream);

  const body = [];
  while (stream.current() && stream.current().type !== "DEDENT") {
    skipNewlines(stream); // Пропускаем любые NEWLINE перед инструкцией
    if (stream.current() && stream.current().type !== "DEDENT") {
      body.push(parsePythonStatement(stream));
    }
  }
  stream.expect("DEDENT"); // Завершение блока функции

  return new ASTNode("FunctionDef", {
    name: funcName.value,
    args,
    body,
    loc: { line: start.line, col: start.col },
  });
}

function parsePythonIf(stream) {
  // if <expr>: <statements> [elif <expr>: <statements>] [else: <statements>]
  const start = stream.expect("KEYWORD", "if");
  const condition = parseMembership(stream);
  stream.expect("OP", ":");

  // Ожидаем NEWLINE и INDENT
  expectNewlineAndIndent(stream);

  const ifBody = [];
  while (
    stream.current() &&
    stream.current().type !== "DEDENT" &&
    !(
      stream.current().type === "KEYWORD" &&
      ["elif", "else"].includes(stream.current().value)
    )
  ) {
    skipNewlines(stream); // Пропускаем любые NEWLINE перед инструкцией
    if (stream.current() && stream.current().type !== "DEDENT") {
      ifBody.push(parsePythonStatement(stream));
    }
  }
  stream.expect("DEDENT"); // Ожидаем завершение блока if

  const elifClauses = [];
  while (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "elif"
  ) {
    stream.next(); // пропускаем 'elif'
    const elifCond = parseMembership(stream);
    stream.expect("OP", ":");

    // Ожидаем NEWLINE и INDENT
    expectNewlineAndIndent(stream);

    const elifBody = [];
    while (
      stream.current() &&
      stream.current().type !== "DEDENT" &&
      !(
        stream.current().type === "KEYWORD" &&
        ["elif", "else"].includes(stream.current().value)
      )
    ) {
      skipNewlines(stream); // Пропускаем любые NEWLINE перед инструкцией
      if (stream.current() && stream.current().type !== "DEDENT") {
        elifBody.push(parsePythonStatement(stream));
      }
    }
    stream.expect("DEDENT"); // Ожидаем завершение блока elif

    elifClauses.push({ condition: elifCond, body: elifBody });
  }

  let elseBody = [];
  if (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "else"
  ) {
    stream.next();
    stream.expect("OP", ":");

    // Ожидаем NEWLINE и INDENT
    expectNewlineAndIndent(stream);

    while (stream.current() && stream.current().type !== "DEDENT") {
      skipNewlines(stream); // Пропускаем любые NEWLINE перед инструкцией
      if (stream.current() && stream.current().type !== "DEDENT") {
        elseBody.push(parsePythonStatement(stream));
      }
    }
    stream.expect("DEDENT"); // Ожидаем завершение блока else
  }

  return new ASTNode("IfStatement", {
    condition,
    ifBody,
    elifClauses,
    elseBody,
    loc: { line: start.line, col: start.col },
  });
}

function parsePythonFor(stream) {
  // for <identifier> in range(...):
  const start = stream.expect("KEYWORD", "for");
  const iterator = stream.expect("IDENTIFIER");
  stream.expect("KEYWORD", "in");
  // упрощенно ждем range(...) или просто expression
  const rangeToken = stream.expect("IDENTIFIER");
  if (rangeToken.value !== "range") {
    throw new PScriptError(
      `Ожидали 'range', а найдено '${rangeToken.value}'`,
      stream.fileName,
      rangeToken.line,
      rangeToken.col
    );
  }
  stream.expect("OP", "(");
  // parse expression (упростим, что там всегда NUMBER)
  const startNum = stream.expect("NUMBER");
  let endNum = null;
  if (stream.current() && stream.current().value === ",") {
    stream.next(); // пропустить запятую
    endNum = stream.expect("NUMBER");
  }
  stream.expect("OP", ")");
  stream.expect("OP", ":");

  // Ожидаем NEWLINE и INDENT
  expectNewlineAndIndent(stream);

  const body = [];
  while (stream.current() && stream.current().type !== "DEDENT") {
    skipNewlines(stream); // Пропускаем любые NEWLINE перед инструкцией
    if (stream.current() && stream.current().type !== "DEDENT") {
      body.push(parsePythonStatement(stream));
    }
  }
  stream.expect("DEDENT"); // Ожидаем завершение блока for

  return new ASTNode("ForStatement", {
    iterator: iterator.value,
    start: startNum.value,
    end: endNum ? endNum.value : null,
    body,
    loc: { line: start.line, col: start.col },
  });
}

function parsePythonWhile(stream) {
  const start = stream.expect("KEYWORD", "while");
  const condition = parsePythonExpression(stream);
  stream.expect("OP", ":");

  // Ожидаем NEWLINE и INDENT
  expectNewlineAndIndent(stream);

  const body = [];
  while (stream.current() && stream.current().type !== "DEDENT") {
    skipNewlines(stream); // Пропускаем любые NEWLINE перед инструкцией
    if (stream.current() && stream.current().type !== "DEDENT") {
      body.push(parsePythonStatement(stream));
    }
  }
  stream.expect("DEDENT"); // Ожидаем завершение блока while

  return new ASTNode("WhileStatement", {
    condition,
    body,
    loc: { line: start.line, col: start.col },
  });
}

function parsePythonTry(stream) {
  // try: <stmts> except: <stmts> [finally: <stmts>]
  const start = stream.expect("KEYWORD", "try");
  stream.expect("OP", ":");

  // Ожидаем NEWLINE и INDENT, пропуская дополнительные NEWLINE
  expectNewlineAndIndent(stream);

  const tryBody = [];
  while (
    stream.current() &&
    stream.current().type !== "DEDENT" &&
    !(
      stream.current().type === "KEYWORD" &&
      ["except", "finally"].includes(stream.current().value)
    )
  ) {
    skipNewlines(stream); // Пропускаем любые NEWLINE перед инструкцией
    if (stream.current() && stream.current().type !== "DEDENT") {
      tryBody.push(parsePythonStatement(stream));
    }
  }
  stream.expect("DEDENT"); // Ожидаем завершение блока try

  let exceptBody = null;
  if (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "except"
  ) {
    stream.next();
    stream.expect("OP", ":");

    // Ожидаем NEWLINE и INDENT для блока except
    expectNewlineAndIndent(stream);

    exceptBody = [];
    while (
      stream.current() &&
      stream.current().type !== "DEDENT" &&
      !(
        stream.current().type === "KEYWORD" &&
        stream.current().value === "finally"
      )
    ) {
      skipNewlines(stream); // Пропускаем любые NEWLINE перед инструкцией
      if (stream.current() && stream.current().type !== "DEDENT") {
        exceptBody.push(parsePythonStatement(stream));
      }
    }
    stream.expect("DEDENT"); // Ожидаем завершение блока except
  }

  let finallyBody = null;
  if (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "finally"
  ) {
    stream.next();
    stream.expect("OP", ":");

    // Ожидаем NEWLINE и INDENT для блока finally
    expectNewlineAndIndent(stream);

    finallyBody = [];
    while (stream.current() && stream.current().type !== "DEDENT") {
      skipNewlines(stream); // Пропускаем любые NEWLINE перед инструкцией
      if (stream.current() && stream.current().type !== "DEDENT") {
        finallyBody.push(parsePythonStatement(stream));
      }
    }
    stream.expect("DEDENT"); // Ожидаем завершение блока finally
  }

  return new ASTNode("TryStatement", {
    tryBody,
    exceptBody,
    finallyBody,
    loc: { line: start.line, col: start.col },
  });
}

function parsePythonReturn(stream) {
  const start = stream.expect("KEYWORD", "return");
  // parse expression (опционально)
  if (!stream.current() || stream.current().type === "KEYWORD") {
    return new ASTNode("ReturnStatement", {
      argument: null,
      loc: { line: start.line, col: start.col },
    });
  }
  const expr = parsePythonExpression(stream);
  return new ASTNode("ReturnStatement", {
    argument: expr,
    loc: { line: start.line, col: start.col },
  });
}

function parsePythonExpression(stream) {
  // Упрощённая версия.
  // Будем считать, что выражение — это либо IDENTIFIER (возможно, с присваиванием),
  // либо вызов print(...), либо число и т.д.
  const token = stream.current();
  if (!token) return null;

  // print(...)?
  if (token.type === "KEYWORD" && token.value === "print") {
    stream.next(); // пропустить print
    stream.expect("OP", "(");

    const args = [];

    // Простейший метод: парсим выражения, разделённые запятыми, до ')'
    while (stream.current() && stream.current().value !== ")") {
      // Вызываем parseExpr (или parsePythonExpression) для одного аргумента
      const exprNode = parseMembership(stream);
      args.push(exprNode);

      if (stream.current() && stream.current().value === ",") {
        stream.next(); // пропускаем запятую и продолжить
      } else {
        break;
      }
    }

    stream.expect("OP", ")");

    return new ASTNode("PrintStatement", { args });
  }

  return parseAssignment(stream);
}
