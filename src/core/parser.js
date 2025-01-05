import { ASTNode } from "./ast.js";
import { PScriptError } from "./errors.js";

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
    // Каждый элемент — полноценное выражение, например parseComparison или parseExpr
    const elem = parseExpr(stream);
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

// parseFactor парсит числа, идентификаторы, скобки (…)
function parseFactor(stream) {
  // обрабатывает числа, идентификаторы, ( expr ), унарный минус и т.д.
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
  const condition = parseComparison(stream);
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
      const exprNode = parseExpr(stream);
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

  return parseExpr(stream);

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
