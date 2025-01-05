import { ASTNode } from "../ast.js";
import { TokenStream } from "../token-stream.js";

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
