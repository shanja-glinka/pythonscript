export function jsASTtoPython(ast) {
  if (!ast) return "";

  switch (ast.type) {
    case "Program":
      return ast.body.map((stmt) => jsASTtoPython(stmt)).join("\n");

    case "ImportDeclaration":
      // import <specifier> from "<source>"
      // -> from "<source>" import <specifier>
      return `from ${quoteStr(ast.source)} import ${ast.specifier}`;

    case "ClassDeclaration":
      return `class ${ast.name}:\n    pass\n`;

    case "FunctionDeclaration":
      // function foo(...) { ... } -> def foo(...):
      return `def ${ast.name}():\n    pass\n`;

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

    case "ConsoleLog":
      // console.log(...) -> print(...)
      return `print("...")  # упрощённое`;

    case "AssignmentExpression":
      return `${ast.left} = 0  # упрощено`;

    case "Identifier":
      return `${ast.name}`;

    default:
      return `# Unhandled JS AST node: ${ast.type}`;
  }
}

function quoteStr(str) {
  return `"${str.replace(/"/g, '\\"')}"`;
}
