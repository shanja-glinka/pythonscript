export function jsASTtoPython(ast) {
  if (!ast) return "";

  switch (ast.type) {
    case "Program":
      return ast.body.map((stmt) => jsASTtoPython(stmt)).join("\n");

    case "VariableDeclaration":
      if (!ast.init) return `${ast.id} = None`;
      return `${ast.id} = ${jsASTtoPython(ast.init)}`;

    case "ImportDeclaration":
      // import <specifier> from "<source>"
      // -> from "<source>" import <specifier>
      return `from ${quoteStr(ast.source)} import ${ast.specifier}`;

    case "Literal":
      if (ast.value === "true") return "True";
      if (ast.value === "false") return "False";
      if (ast.value === "null") return "None";
      if (typeof ast.value === "string" && ast.value.startsWith('"')) return `f${ast.value}`;
      if (typeof ast.value === "string" && ast.value.startsWith("'")) return `f${ast.value}`;
      return `${ast.value}`;

    case "Identifier":
      return `${ast.name}`;

    case "ArrayExpression":
      return `[${ast.elements.map((e) => jsASTtoPython(e)).join(", ")}]`;

    case "ObjectExpression":
      return `{ ${ast.properties
        .map((p) => `${p.key.name}: ${jsASTtoPython(p.value)}`)
        .join(", ")} }`;

    case "MemberExpression": {
      const obj = jsASTtoPython(ast.object);
      const prop = jsASTtoPython(ast.property);
      if (ast.computed) {
        return `${obj}[${prop}]`;
      }
      return `${obj}.${prop}`;
    }

    case "CallExpression": {
      // console.log(...) -> print(...)
      if (
        ast.callee.type === "MemberExpression" &&
        ast.callee.object.type === "Identifier" &&
        ast.callee.object.name === "console" &&
        ast.callee.property.type === "Identifier" &&
        ast.callee.property.name === "log"
      ) {
        const args = ast.arguments.map((a) => jsASTtoPython(a)).join(", ");
        return `print(${args})`;
      }

      // arr.slice(start, end) -> arr[start:end]
      if (
        ast.callee.type === "MemberExpression" &&
        ast.callee.property.type === "Identifier" &&
        ast.callee.property.name === "slice" &&
        ast.arguments.length >= 1
      ) {
        const obj = jsASTtoPython(ast.callee.object);
        const start = jsASTtoPython(ast.arguments[0]);
        const end = ast.arguments[1] ? jsASTtoPython(ast.arguments[1]) : "";
        return `${obj}[${start}:${end}]`;
      }

      // arr.includes(x) -> x in arr
      if (
        ast.callee.type === "MemberExpression" &&
        ast.callee.property.type === "Identifier" &&
        ast.callee.property.name === "includes" &&
        ast.arguments.length === 1
      ) {
        const obj = jsASTtoPython(ast.callee.object);
        const arg = jsASTtoPython(ast.arguments[0]);
        return `${arg} in ${obj}`;
      }

      // arr.push(x) -> arr.append(x)
      if (
        ast.callee.type === "MemberExpression" &&
        ast.callee.property.type === "Identifier" &&
        ast.callee.property.name === "push"
      ) {
        const obj = jsASTtoPython(ast.callee.object);
        const args = ast.arguments.map((a) => jsASTtoPython(a)).join(", ");
        return `${obj}.append(${args})`;
      }

      // arr.pop() -> arr.pop()
      if (
        ast.callee.type === "MemberExpression" &&
        ast.callee.property.type === "Identifier" &&
        ast.callee.property.name === "pop"
      ) {
        const obj = jsASTtoPython(ast.callee.object);
        return `${obj}.pop()`;
      }

      const callee = jsASTtoPython(ast.callee);
      const args = ast.arguments.map((a) => jsASTtoPython(a)).join(", ");
      return `${callee}(${args})`;
    }

    case "UnaryExpression":
      if (ast.operator === "!") return `not ${jsASTtoPython(ast.argument)}`;
      return `${ast.operator}${jsASTtoPython(ast.argument)}`;

    case "LogicalExpression": {
      const op = ast.operator === "&&" ? "and" : "or";
      return `(${jsASTtoPython(ast.left)} ${op} ${jsASTtoPython(ast.right)})`;
    }

    case "BinaryExpression": {
      const op =
        ast.operator === "&&"
          ? "and"
          : ast.operator === "||"
          ? "or"
          : ast.operator === "==="
          ? "=="
          : ast.operator === "!=="
          ? "!="
          : ast.operator;
      return `(${jsASTtoPython(ast.left)} ${op} ${jsASTtoPython(ast.right)})`;
    }

    case "ClassDeclaration":
      return `class ${ast.name}:\n    pass\n`;

    case "FunctionDeclaration":
      const params = ast.params.join(", ");
      const body = ast.body.map((stmt) => jsASTtoPython(stmt)).join("\n    ");
      return `def ${ast.name}(${params}):\n    ${body || "pass"}\n`;

    case "IfStatement":
      return `if True:\n    pass\n  # Упрощённый if\n`;

    case "ForStatement":
      return `for i in range(0, 10):\n    pass  # упрощено\n`;

    case "WhileStatement":
      return `while True:\n    pass\n`;

    case "TryStatement":
      return `try:\n    pass\nexcept:\n    pass\nfinally:\n    pass\n`;

    case "ReturnStatement":
      return `return`;

    default:
      return "";
  }
}

function quoteStr(str) {
  return `"${str.replace(/"/g, '\\"')}"`;
}
