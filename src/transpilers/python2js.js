export function pythonASTtoJS(ast) {
  // Рекурсивный обход дерева
  if (!ast) return "";

  switch (ast.type) {
    case "Module":
      return ast.body.map((stmt) => pythonASTtoJS(stmt)).join("\n");

    case "ImportStatement":
      // import <moduleName> as <alias>
      // В JS напишем: const alias = require("<moduleName>");
      // Или modern: import * as alias from 'moduleName'; (но динамически это нельзя)
      // Для упрощения используем CommonJS-стиль:
      return `const ${ast.alias || ast.moduleName} = require("${
        ast.moduleName
      }");`;

    case "FromImportStatement":
      // from <moduleName> import <importedName> as <alias>
      return `const { ${ast.importedName} : ${
        ast.alias || ast.importedName
      } } = require("${ast.moduleName}");`;

    case "ClassDef":
      // class X: ...
      // В JS -> class X { ... }
      // Для упрощения просто объявим пустой класс без методов
      return (
        `class ${ast.name} {\n  constructor() {\n    // TODO: init\n  }\n}\n` +
        ast.body.map((stmt) => pythonASTtoJS(stmt)).join("\n")
      );

    case "FunctionDef":
      // def foo(a, b): ...
      // -> function foo(a, b) { ... }
      return (
        `function ${ast.name}(${ast.args.join(", ")}) {\n` +
        ast.body.map((s) => pythonASTtoJS(s)).join("\n") +
        `\n}`
      );

    case "IfStatement": {
      const elifs = ast.elifClauses
        .map((elif) => {
          const condJS = pythonASTtoJS(elif.condition);
          const bodyJS = elif.body.map((s) => pythonASTtoJS(s)).join("\n");
          return `else if (${condJS}) {\n${bodyJS}\n}`;
        })
        .join("\n");
      const elsePart = ast.elseBody
        ? `else {\n${ast.elseBody.map((s) => pythonASTtoJS(s)).join("\n")}\n}`
        : "";
      return (
        `if (${pythonASTtoJS(ast.condition)}) {\n${ast.ifBody
          .map((s) => pythonASTtoJS(s))
          .join("\n")}\n}` + `\n${elifs}\n${elsePart}`
      );
    }

    case "ForStatement":
      // for i in range(start, end):
      // -> for (let i = start; i < end; i++) { ... }
      // упрощение
      let start = ast.start || "0";
      let end = ast.end || ast.start; // если end=null, значит range(0, start)
      const loopBody = ast.body.map((s) => pythonASTtoJS(s)).join("\n");
      return `for (let ${ast.iterator} = ${start}; ${ast.iterator} < ${end}; ${ast.iterator}++) {\n${loopBody}\n}`;

    case "WhileStatement":
      // while <cond>: ...
      return `while (${pythonASTtoJS(ast.condition)}) {\n${ast.body
        .map((s) => pythonASTtoJS(s))
        .join("\n")}\n}`;

    case "TryStatement": {
      const tryBlock = ast.tryBody.map((s) => pythonASTtoJS(s)).join("\n");
      const exceptBlock = ast.exceptBody
        ? ast.exceptBody.map((s) => pythonASTtoJS(s)).join("\n")
        : "";
      const finallyBlock = ast.finallyBody
        ? ast.finallyBody.map((s) => pythonASTtoJS(s)).join("\n")
        : "";
      let code = `try {\n${tryBlock}\n}`;
      if (ast.exceptBody) {
        code += ` catch (e) {\n${exceptBlock}\n}`;
      }
      if (ast.finallyBody) {
        code += ` finally {\n${finallyBlock}\n}`;
      }
      return code;
    }

    case "ReturnStatement":
      if (!ast.argument) return `return;`;
      return `return ${pythonASTtoJS(ast.argument)};`;

    case "PrintStatement":
      // print(...) -> console.log(...)
      // Аргументы — массив ASTNode('STRING' / 'NUMBER' / 'Variable' / и т.д.)
      const argsJS = ast.args.map((a) => pythonASTtoJS(a)).join(", ");
      return `console.log(${argsJS});`;

    case "AssignStatement":
      // x = expr
      return `${ast.left} = ${pythonASTtoJS(ast.right)};`;

    case "StringLiteral":
      return JSON.stringify(ast.value);

    case "NumberLiteral":
      return ast.value;

    case "Variable":
      return ast.name;

    case "BinOp":
      if (ast.op === "**") {
        // Возведение в степень
        return `(${pythonASTtoJS(ast.left)} ** ${pythonASTtoJS(ast.right)})`;
      } else if (ast.op === "//") {
        // Целочисленное деление
        const leftJS = pythonASTtoJS(ast.left);
        const rightJS = pythonASTtoJS(ast.right);
        return `Math.floor(${leftJS} / ${rightJS})`;
      } else {
        // +, -, *, /, % и т.д.
        return `(${pythonASTtoJS(ast.left)} ${ast.op} ${pythonASTtoJS(
          ast.right
        )})`;
      }

    default:
      // Если не знаем, вернём пустую строку или комментарий
      return `/* Unhandled Python AST node: ${ast.type} */`;
  }
}
