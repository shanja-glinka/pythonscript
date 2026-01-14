import { ASTNode } from "../ast.js";
import { PScriptError } from "../errors.js";
import { tokenizePython } from "./lexer.js";
import { TokenStream } from "../token-stream.js";

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
  // возведение в степень (**), правоассоциативно
  let base = parseUnary(stream);
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

function parseTerm(stream) {
  // *, /, //, %
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

function parseExpr(stream) {
  // +, -
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
  // сравнения и membership + цепочки
  let left = parseExpr(stream);
  const comparisons = [];

  while (stream.current()) {
    const cur = stream.current();

    // "not in"
    if (
      cur.type === "KEYWORD" &&
      cur.value === "not" &&
      stream.peek(1) &&
      stream.peek(1).type === "KEYWORD" &&
      stream.peek(1).value === "in"
    ) {
      stream.next(); // not
      stream.next(); // in
      const right = parseExpr(stream);
      comparisons.push({ op: "not in", right });
      continue;
    }

    // "in"
    if (cur.type === "KEYWORD" && cur.value === "in") {
      stream.next();
      const right = parseExpr(stream);
      comparisons.push({ op: "in", right });
      continue;
    }

    if (cur.type === "OP" && ["<", ">", "<=", ">=", "==", "!="].includes(cur.value)) {
      const op = cur.value;
      stream.next();
      const right = parseExpr(stream);
      comparisons.push({ op, right });
      continue;
    }

    break;
  }

  if (comparisons.length === 0) {
    return left;
  }

  return new ASTNode("CompareChain", { left, comparisons });
}

function parseBoolNot(stream) {
  const cur = stream.current();
  if (cur && cur.type === "KEYWORD" && cur.value === "not") {
    stream.next();
    const operand = parseBoolNot(stream);
    return new ASTNode("UnaryOp", { op: "not", operand });
  }
  return parseComparison(stream);
}

function parseBoolAnd(stream) {
  let left = parseBoolNot(stream);
  while (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "and"
  ) {
    const op = stream.current().value;
    stream.next();
    const right = parseBoolNot(stream);
    left = new ASTNode("BooleanOp", { op, left, right });
  }
  return left;
}

function parseBoolOr(stream) {
  let left = parseBoolAnd(stream);
  while (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "or"
  ) {
    const op = stream.current().value;
    stream.next();
    const right = parseBoolAnd(stream);
    left = new ASTNode("BooleanOp", { op, left, right });
  }
  return left;
}

function parseConditional(stream) {
  // x if cond else y
  let expr = parseBoolOr(stream);
  if (stream.current() && stream.current().type === "KEYWORD" && stream.current().value === "if") {
    stream.next(); // if
    const test = parseBoolOr(stream);
    stream.expect("KEYWORD", "else");
    const alternate = parseBoolOr(stream);
    expr = new ASTNode("ConditionalExpression", {
      test,
      consequent: expr,
      alternate,
    });
  }
  return expr;
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

function parseUnary(stream) {
  const token = stream.current();
  if (token && token.type === "OP" && (token.value === "-" || token.value === "+")) {
    stream.next();
    const operand = parseUnary(stream);
    return new ASTNode("UnaryOp", { op: token.value, operand });
  }
  return parsePrimary(stream);
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

  // None / True / False
  if (token.type === "KEYWORD") {
    if (token.value === "None") {
      stream.next();
      return new ASTNode("NullLiteral", {});
    }
    if (token.value === "True" || token.value === "False") {
      stream.next();
      return new ASTNode("BooleanLiteral", { value: token.value === "True" });
    }
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
    return new ASTNode("Variable", { name: token.value });
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
    const argExpr = parseConditional(stream);
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

// parsePrimary парсит числа, идентификаторы, скобки (…)
function parsePrimary(stream) {
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
      // Индексация или срез: obj[...]
      stream.next(); // пропустить '['

      // Срезы вида start:stop:step
      let start = null;
      let stop = null;
      let step = null;
      let isSlice = false;

      if (!(stream.current() && stream.current().type === "OP" && stream.current().value === ":") &&
          !(stream.current() && stream.current().type === "OP" && stream.current().value === "]")) {
        start = parseConditional(stream);
      }

      if (stream.current() && stream.current().type === "OP" && stream.current().value === ":") {
        isSlice = true;
        stream.next(); // пропустить ':'
        if (
          stream.current() &&
          !(stream.current().type === "OP" && [";", ":"].includes(stream.current().value)) &&
          !(stream.current().type === "OP" && stream.current().value === "]")
        ) {
          stop = parseConditional(stream);
        }
        if (stream.current() && stream.current().type === "OP" && stream.current().value === ":") {
          stream.next(); // пропустить вторую ':'
          if (stream.current() && !(stream.current().type === "OP" && stream.current().value === "]")) {
            step = parseConditional(stream);
          }
        }
      }

      stream.expect("OP", "]");

      if (isSlice) {
        node = new ASTNode("SliceAccess", { object: node, start, stop, step });
      } else {
        node = new ASTNode("IndexAccess", { object: node, index: start });
      }
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
  let left = parseConditional(stream);

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

  // Расширенные присваивания: +=, -=, *=, /=, //=, %=, **=
  const augOps = ["+=", "-=", "*=", "/=", "//=", "%=", "**="];
  if (cur && cur.type === "OP" && augOps.includes(cur.value)) {
    const op = cur.value;
    const loc = { line: cur.line, col: cur.col };
    stream.next();
    const right = parseAssignment(stream);
    return new ASTNode("AugAssign", { op, left, right, loc });
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

  if (token.type === "COMMENT") {
    stream.next(); // Пропускаем комментарий
    return new ASTNode("Comment", {
      value: token.value,
      loc: { line: token.line, col: token.col },
    });
  }

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

  // Парсинг аргументов
  const args = [];
  while (stream.current() && !(stream.current().type === "OP" && stream.current().value === ")")) {
    // *args / **kwargs
    if (stream.current().type === "OP" && stream.current().value === "*") {
      stream.next();
      const argToken = stream.expect("IDENTIFIER");
      args.push({ name: argToken.value, kind: "rest" });
    } else if (stream.current().type === "OP" && stream.current().value === "**") {
      stream.next();
      const argToken = stream.expect("IDENTIFIER");
      args.push({ name: argToken.value, kind: "kwargs" });
    } else {
      const argToken = stream.expect("IDENTIFIER");
      if (argToken.value !== "self") {
        let defaultValue = null;
        if (stream.current() && stream.current().type === "OP" && stream.current().value === "=") {
          stream.next();
          defaultValue = parseConditional(stream);
        }
        args.push({ name: argToken.value, kind: "positional", default: defaultValue });
      }
    }

    if (stream.current() && stream.current().type === "OP" && stream.current().value === ",") {
      stream.next();
      continue;
    } else {
      break;
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
  const condition = parseBoolOr(stream);
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
    const elifCond = parseBoolOr(stream);
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
  // parse expression(ы)
  const startNum = parseConditional(stream);
  let endNum = null;
  if (stream.current() && stream.current().value === ",") {
    stream.next(); // пропустить запятую
    endNum = parseConditional(stream);
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
  const condition = parseBoolOr(stream);
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
        const exprNode = parseConditional(stream);
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
