import { ASTNode } from "../ast.js";
import { TokenStream } from "../token-stream.js";

const PRECEDENCE = [
  ["||"],
  ["&&"],
  ["==", "===", "!=", "!==", "<", ">", "<=", ">="],
  ["+", "-"],
  ["*", "/", "%"],
  ["**"],
];

export function parseJavaScriptTokens(tokens, fileName = "<anonymous>") {
  const stream = new TokenStream(tokens, fileName);
  const body = [];

  while (stream.current()) {
    // пропускаем разделители
    if (stream.current().type === "OP" && stream.current().value === ";") {
      stream.next();
      continue;
    }
    const stmt = parseJSStatement(stream);
    if (stmt) body.push(stmt);
    // пропускать финальные ;
    if (stream.current() && stream.current().type === "OP" && stream.current().value === ";") {
      stream.next();
    }
  }

  return new ASTNode("Program", { body });
}

function parseJSStatement(stream) {
  const token = stream.current();
  if (!token) return null;

  if (token.type === "KEYWORD" && ["let", "const", "var"].includes(token.value)) {
    return parseVariableDeclaration(stream);
  }

  if (
    token.type === "KEYWORD" &&
    ["if", "else", "for", "while", "try", "catch", "finally", "function", "class"].includes(
      token.value
    )
  ) {
    skipStructure(stream);
    return new ASTNode("IgnoredStatement", {});
  }

  // упрощённо: остальные строки — выражения
  return parseExpression(stream);
}

function skipStructure(stream) {
  // Простейший пропуск блока {...}
  stream.next(); // пропустить ключевое слово
  // пропускаем до '{'
  while (stream.current() && !(stream.current().type === "OP" && stream.current().value === "{")) {
    stream.next();
  }
  if (stream.current() && stream.current().type === "OP" && stream.current().value === "{") {
    let depth = 0;
    while (stream.current()) {
      if (stream.current().type === "OP" && stream.current().value === "{") depth++;
      if (stream.current().type === "OP" && stream.current().value === "}") {
        depth--;
        if (depth === 0) {
          stream.next();
          break;
        }
      }
      stream.next();
    }
  }
}

function parseVariableDeclaration(stream) {
  stream.next(); // let/const/var
  const id = stream.expect("IDENTIFIER");
  let init = null;
  if (stream.current() && stream.current().type === "OP" && stream.current().value === "=") {
    stream.next();
    init = parseExpression(stream);
  }
  return new ASTNode("VariableDeclaration", {
    id: id.value,
    init,
  });
}

function parseExpression(stream) {
  return parseBinary(stream, 0);
}

function parseBinary(stream, precIndex) {
  if (precIndex >= PRECEDENCE.length) {
    return parseUnary(stream);
  }

  let left = parseBinary(stream, precIndex + 1);

  while (true) {
    const cur = stream.current();
    if (!cur || cur.type !== "OP") break;
    if (!PRECEDENCE[precIndex].includes(cur.value)) break;
    const op = cur.value;
    stream.next();
    const right = parseBinary(stream, precIndex + 1);
    const nodeType = ["&&", "||"].includes(op) ? "LogicalExpression" : "BinaryExpression";
    left = new ASTNode(nodeType, { operator: op, left, right });
  }

  return left;
}

function parseUnary(stream) {
  const cur = stream.current();
  if (cur && cur.type === "OP" && (cur.value === "!" || cur.value === "-" || cur.value === "+")) {
    stream.next();
    const argument = parseUnary(stream);
    return new ASTNode("UnaryExpression", { operator: cur.value, argument });
  }
  return parseCallMember(stream);
}

function parseCallMember(stream) {
  let obj = parsePrimary(stream);

  while (true) {
    const cur = stream.current();
    if (!cur || cur.type !== "OP") break;

    if (cur.value === ".") {
      stream.next();
      const prop = stream.expect("IDENTIFIER");
      obj = new ASTNode("MemberExpression", {
        object: obj,
        property: new ASTNode("Identifier", { name: prop.value }),
        computed: false,
      });
      continue;
    }

    if (cur.value === "[") {
      stream.next();
      const propExpr = parseExpression(stream);
      stream.expect("OP", "]");
      obj = new ASTNode("MemberExpression", {
        object: obj,
        property: propExpr,
        computed: true,
      });
      continue;
    }

    if (cur.value === "(") {
      stream.next();
      const args = [];
      while (stream.current() && !(stream.current().type === "OP" && stream.current().value === ")")) {
        args.push(parseExpression(stream));
        if (stream.current() && stream.current().type === "OP" && stream.current().value === ",") {
          stream.next();
        } else {
          break;
        }
      }
      stream.expect("OP", ")");
      obj = new ASTNode("CallExpression", { callee: obj, arguments: args });
      continue;
    }

    break;
  }

  return obj;
}

function parsePrimary(stream) {
  const token = stream.current();
  if (!token) return new ASTNode("UnknownExpression", {});

  // Literals
  if (token.type === "NUMBER") {
    stream.next();
    return new ASTNode("Literal", { value: token.value });
  }
  if (token.type === "STRING") {
    stream.next();
    return new ASTNode("Literal", { value: JSON.stringify(token.value) });
  }
  if (token.type === "IDENTIFIER" && ["true", "false", "null"].includes(token.value)) {
    stream.next();
    if (token.value === "true") return new ASTNode("Literal", { value: "true" });
    if (token.value === "false") return new ASTNode("Literal", { value: "false" });
    return new ASTNode("Literal", { value: "null" });
  }

  // Array literal
  if (token.type === "OP" && token.value === "[") {
    stream.next();
    const elements = [];
    while (stream.current() && !(stream.current().type === "OP" && stream.current().value === "]")) {
      elements.push(parseExpression(stream));
      if (stream.current() && stream.current().type === "OP" && stream.current().value === ",") {
        stream.next();
      } else {
        break;
      }
    }
    stream.expect("OP", "]");
    return new ASTNode("ArrayExpression", { elements });
  }

  // Object literal
  if (token.type === "OP" && token.value === "{") {
    stream.next();
    const properties = [];
    while (stream.current() && !(stream.current().type === "OP" && stream.current().value === "}")) {
      const keyToken = stream.current();
      if (keyToken.type !== "IDENTIFIER" && keyToken.type !== "STRING") {
        break;
      }
      stream.next();
      stream.expect("OP", ":");
      const value = parseExpression(stream);
      properties.push({
        key: new ASTNode("Identifier", { name: keyToken.value }),
        value,
      });
      if (stream.current() && stream.current().type === "OP" && stream.current().value === ",") {
        stream.next();
      } else {
        break;
      }
    }
    stream.expect("OP", "}");
    return new ASTNode("ObjectExpression", { properties });
  }

  // Parentheses
  if (token.type === "OP" && token.value === "(") {
    stream.next();
    const expr = parseExpression(stream);
    stream.expect("OP", ")");
    return expr;
  }

  if (token.type === "IDENTIFIER") {
    stream.next();
    return new ASTNode("Identifier", { name: token.value });
  }

  stream.next();
  return new ASTNode("UnknownExpression", {});
}
