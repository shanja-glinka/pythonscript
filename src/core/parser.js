import { ASTNode } from "./ast.js";
import { PScriptError } from "./errors.js";
import { tokenizePython } from "./lexer.js";

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

// Обрабатывает (expr), NUMBER, STRING, IDENTIFIER, [list-literal], {dict?}, и т.д.// обрабатывает числа, идентификаторы, ( expr ), унарный минус и т.д.
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
      // Если node === AttributeAccess(...), то arr.append(...) и т.п.
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

/**
 * Простейшая обёртка для итерации по массиву токенов.
 */
class TokenStream {
  constructor(tokens, fileName = "<anonymous>") {
    this.tokens = tokens;
    this.pos = 0;
    this.fileName = fileName;
  }

  current() {
    return this.tokens[this.pos] || null;
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset] || null;
  }

  next() {
    this.pos++;
    return this.current();
  }

  expect(type, value = null) {
    const token = this.current();
    if (!token) {
      throw new PScriptError(
        `Ожидался токен ${type}${
          value ? " " + value : ""
        }, но достигнут конец файла`,
        this.fileName,
        0,
        0
      );
    }
    if (token.type !== type || (value && token.value !== value)) {
      throw new PScriptError(
        `Ожидался токен ${type}${value ? " " + value : ""}, а найден ${
          token.type
        } ${token.value}`,
        this.fileName,
        token.line,
        token.col
      );
    }
    this.next();
    return token;
  }
}

/* =========================================
      ПАРСЕР P Y T H O N
   ========================================= */

export function parsePythonTokens(tokens, fileName = "<anonymous>") {
  const stream = new TokenStream(tokens, fileName);
  const body = [];

  while (stream.current()) {
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
  // упрощённо: не обрабатываем ( ... ) для наследования
  // ждём двоеточие
  stream.expect("OP", ":");
  // в реальном Python тут пошёл бы блок с отступами
  // Упростим: считаем, что до следующего ключевого слова — тело класса
  // Для демонстрации: делаем вид, что тело класса — просто список инструкций
  const body = [];
  while (
    stream.current() &&
    stream.current().type !== "KEYWORD" &&
    stream.current().type !== null
  ) {
    body.push(parsePythonStatement(stream));
  }
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
  // парсим аргументы (упростим)
  const args = [];
  if (stream.current() && stream.current().type === "IDENTIFIER") {
    const firstArg = stream.current();
    stream.next();
    args.push(firstArg.value);
    while (stream.current() && stream.current().value === ",") {
      stream.next(); // пропускаем запятую
      const nxt = stream.expect("IDENTIFIER");
      args.push(nxt.value);
    }
  }
  stream.expect("OP", ")");
  stream.expect("OP", ":");
  // тело функции
  const body = [];
  while (
    stream.current() &&
    stream.current().type !== "KEYWORD" &&
    stream.current().type !== null
  ) {
    body.push(parsePythonStatement(stream));
  }
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
  const ifBody = [];
  while (
    stream.current() &&
    !(
      stream.current().type === "KEYWORD" &&
      ["elif", "else"].includes(stream.current().value)
    )
  ) {
    ifBody.push(parsePythonStatement(stream));
  }
  const elifClauses = [];
  while (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "elif"
  ) {
    stream.next(); // пропускаем 'elif'
    const elifCond = parsePythonExpression(stream);
    stream.expect("OP", ":");
    const elifBody = [];
    while (
      stream.current() &&
      !(
        stream.current().type === "KEYWORD" &&
        ["elif", "else"].includes(stream.current().value)
      )
    ) {
      elifBody.push(parsePythonStatement(stream));
    }
    elifClauses.push({ condition: elifCond, body: elifBody });
  }
  let elseBody = null;
  if (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "else"
  ) {
    stream.next();
    stream.expect("OP", ":");
    elseBody = [];
    while (stream.current() && !(stream.current().type === "KEYWORD")) {
      elseBody.push(parsePythonStatement(stream));
    }
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
  const body = [];
  while (stream.current() && stream.current().type !== "KEYWORD") {
    body.push(parsePythonStatement(stream));
  }
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
  const body = [];
  while (stream.current() && stream.current().type !== "KEYWORD") {
    body.push(parsePythonStatement(stream));
  }
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
  const tryBody = [];
  while (
    stream.current() &&
    !(
      stream.current().type === "KEYWORD" &&
      (stream.current().value === "except" ||
        stream.current().value === "finally")
    )
  ) {
    tryBody.push(parsePythonStatement(stream));
  }
  let exceptBody = null;
  if (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "except"
  ) {
    stream.next();
    stream.expect("OP", ":");
    exceptBody = [];
    while (
      stream.current() &&
      !(
        stream.current().type === "KEYWORD" &&
        stream.current().value === "finally"
      )
    ) {
      exceptBody.push(parsePythonStatement(stream));
    }
  }
  let finallyBody = null;
  if (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "finally"
  ) {
    stream.next();
    stream.expect("OP", ":");
    finallyBody = [];
    while (stream.current() && stream.current().type !== null) {
      finallyBody.push(parsePythonStatement(stream));
    }
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
        stream.next(); // пропустить запятую и продолжить
      } else {
        break;
      }
    }

    stream.expect("OP", ")");

    return new ASTNode("PrintStatement", { args });
  }

  // Проверим присваивание: <IDENTIFIER> = <expression>
  if (
    token.type === "IDENTIFIER" &&
    stream.peek(1) &&
    stream.peek(1).type === "OP" &&
    stream.peek(1).value === "="
  ) {
    const ident = token.value;
    stream.next(); // skip operand
    const eqToken = stream.next(); // пропускаем '='
    const right = parsePythonExpression(stream);
    return new ASTNode("AssignStatement", {
      left: ident,
      right,
      loc: { line: eqToken.line, col: eqToken.col },
    });
  }

  return parseMembership(stream);

  // Если это строка, число или идентификатор — вернем литерал (или Variable)
  if (token.type === "STRING") {
    stream.next();
    return new ASTNode("StringLiteral", { value: token.value });
  }
  if (token.type === "NUMBER") {
    stream.next();
    return new ASTNode("NumberLiteral", { value: token.value });
  }
  if (token.type === "IDENTIFIER") {
    stream.next();
    return new ASTNode("Variable", { name: token.value });
  }

  // Иначе — ошибка
  throw new PScriptError(
    `Неожиданное начало выражения: ${token.type} ${token.value}`,
    stream.fileName,
    token.line,
    token.col
  );
}

/* =========================================
      ПАРСЕР J A V A S C R I P T
   ========================================= */

export function parseJavaScriptTokens(tokens, fileName = "<anonymous>") {
  // Аналогично, но для JS
  // Чтобы не растягивать ответ, пусть будет супер-упрощённый,
  // возвращающий Program со списком "Statement" узлов.
  const stream = new TokenStream(tokens, fileName);
  const body = [];

  while (stream.current()) {
    body.push(parseJSStatement(stream));
  }

  return new ASTNode("Program", { body });
}

function parseJSStatement(stream) {
  // Аналогично parsePythonStatement, но для JS
  // Распознаём:
  // import, function, class, if, for, while, try, return, etc.
  const token = stream.current();
  if (!token) return null;

  if (token.type === "KEYWORD") {
    switch (token.value) {
      case "import":
        return parseJSImport(stream);
      case "function":
        return parseJSFunction(stream);
      case "class":
        return parseJSClass(stream);
      case "if":
        return parseJSIf(stream);
      case "for":
        return parseJSFor(stream);
      case "while":
        return parseJSWhile(stream);
      case "try":
        return parseJSTry(stream);
      case "return":
        return parseJSReturn(stream);
      default:
        // Возможно console.log(...) или объявление let ...
        return parseJSExpression(stream);
    }
  } else {
    return parseJSExpression(stream);
  }
}

// И т.д. — из-за длины ответа я не буду расписывать все парсеры для JS,
// логика аналогична parsePython*.

function parseJSImport(stream) {
  // import <IDENTIFIER> from <STRING> (упрощённо)
  const start = stream.expect("KEYWORD", "import");
  const what = stream.expect("IDENTIFIER");
  stream.expect("KEYWORD", "from");
  const modPath = stream.expect("STRING");
  return new ASTNode("ImportDeclaration", {
    specifier: what.value,
    source: modPath.value,
    loc: { line: start.line, col: start.col },
  });
}

function parseJSFunction(stream) {
  // function <IDENTIFIER>(...) { ... }
  const start = stream.expect("KEYWORD", "function");
  const funcName = stream.expect("IDENTIFIER");
  stream.expect("OP", "(");
  // упрощенно — без аргументов
  stream.expect("OP", ")");
  stream.expect("OP", "{");
  // упрощенно — пустое тело
  while (stream.current() && !(stream.current().value === "}")) {
    // ... парсим вложенные инструкции
    break; // для краткости сейчас пропустим
  }
  stream.expect("OP", "}");
  return new ASTNode("FunctionDeclaration", {
    name: funcName.value,
    body: [],
    loc: { line: start.line, col: start.col },
  });
}

function parseJSClass(stream) {
  const start = stream.expect("KEYWORD", "class");
  const className = stream.expect("IDENTIFIER");
  // Возможно extends ...
  if (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "extends"
  ) {
    // пропустить extends <IDENTIFIER>
    stream.next();
    stream.expect("IDENTIFIER"); // упустим имя родительского класса
  }
  stream.expect("OP", "{");
  // упрощённо пропустим методы
  while (stream.current() && stream.current().value !== "}") {
    stream.next();
  }
  stream.expect("OP", "}");

  return new ASTNode("ClassDeclaration", {
    name: className.value,
    body: [],
    loc: { line: start.line, col: start.col },
  });
}

function parseJSIf(stream) {
  // if (<expr>) { ... } else { ... }
  const start = stream.expect("KEYWORD", "if");
  stream.expect("OP", "(");
  // в реальности нужно разобрать выражение
  while (stream.current() && stream.current().value !== ")") {
    stream.next();
  }
  stream.expect("OP", ")");
  stream.expect("OP", "{");
  while (stream.current() && stream.current().value !== "}") {
    stream.next();
  }
  stream.expect("OP", "}");
  // else ...
  if (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "else"
  ) {
    stream.next();
    if (stream.current() && stream.current().value === "if") {
      // else if
      // ... рекурсивный разбор?
      // для упрощения опустим
    } else {
      // else { ... }
      if (stream.current() && stream.current().value === "{") {
        stream.next();
        while (stream.current() && stream.current().value !== "}") {
          stream.next();
        }
        stream.expect("OP", "}");
      }
    }
  }
  return new ASTNode("IfStatement", {
    loc: { line: start.line, col: start.col },
  });
}

function parseJSFor(stream) {
  // for (...) { ... }
  const start = stream.expect("KEYWORD", "for");
  stream.expect("OP", "(");
  while (stream.current() && stream.current().value !== ")") {
    stream.next();
  }
  stream.expect("OP", ")");
  stream.expect("OP", "{");
  while (stream.current() && stream.current().value !== "}") {
    stream.next();
  }
  stream.expect("OP", "}");
  return new ASTNode("ForStatement", {
    loc: { line: start.line, col: start.col },
  });
}

function parseJSWhile(stream) {
  // while (...) { ... }
  const start = stream.expect("KEYWORD", "while");
  stream.expect("OP", "(");
  while (stream.current() && stream.current().value !== ")") {
    stream.next();
  }
  stream.expect("OP", ")");
  stream.expect("OP", "{");
  while (stream.current() && stream.current().value !== "}") {
    stream.next();
  }
  stream.expect("OP", "}");
  return new ASTNode("WhileStatement", {
    loc: { line: start.line, col: start.col },
  });
}

function parseJSTry(stream) {
  // try { ... } catch(e) { ... } finally { ... }
  const start = stream.expect("KEYWORD", "try");
  stream.expect("OP", "{");
  while (stream.current() && stream.current().value !== "}") {
    stream.next();
  }
  stream.expect("OP", "}");
  if (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "catch"
  ) {
    stream.next();
    stream.expect("OP", "(");
    while (stream.current() && stream.current().value !== ")") {
      stream.next();
    }
    stream.expect("OP", ")");
    stream.expect("OP", "{");
    while (stream.current() && stream.current().value !== "}") {
      stream.next();
    }
    stream.expect("OP", "}");
  }
  if (
    stream.current() &&
    stream.current().type === "KEYWORD" &&
    stream.current().value === "finally"
  ) {
    stream.next();
    stream.expect("OP", "{");
    while (stream.current() && stream.current().value !== "}") {
      stream.next();
    }
    stream.expect("OP", "}");
  }
  return new ASTNode("TryStatement", {
    loc: { line: start.line, col: start.col },
  });
}

function parseJSReturn(stream) {
  const start = stream.expect("KEYWORD", "return");
  // упрощенно: нет выражения
  return new ASTNode("ReturnStatement", {
    loc: { line: start.line, col: start.col },
  });
}

function parseJSExpression(stream) {
  // Упрощённо: если это IDENTIFIER и следом =, то присваивание
  const token = stream.current();
  if (!token) return null;
  if (
    token.type === "IDENTIFIER" &&
    stream.peek(1) &&
    stream.peek(1).value === "="
  ) {
    const ident = token.value;
    stream.next();
    const eq = stream.next(); // '='
    // в реальности тут parseJSExpression(...)
    if (stream.current()) {
      stream.next();
    }
    return new ASTNode("AssignmentExpression", { left: ident });
  }
  // console.log(...)?
  if (
    token.type === "IDENTIFIER" &&
    token.value === "console" &&
    stream.peek(1) &&
    stream.peek(1).value === "."
  ) {
    // console.log
    stream.next(); // пропустить console
    stream.next(); // пропустить .
    if (stream.current() && stream.current().value === "log") {
      stream.next();
      if (stream.current() && stream.current().value === "(") {
        // пропустить до ')'
        while (stream.current() && stream.current().value !== ")") {
          stream.next();
        }
        if (stream.current()) {
          stream.next(); // пропустить ')'
        }
      }
      return new ASTNode("ConsoleLog", {});
    }
  }

  // Либо просто возвращаем узел "Identifier" (для демонстрации)
  if (token.type === "IDENTIFIER") {
    stream.next();
    return new ASTNode("Identifier", { name: token.value });
  }
  // И т.д.
  stream.next();
  return new ASTNode("UnknownExpression", {});
}
