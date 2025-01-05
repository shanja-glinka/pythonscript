export function pythonASTtoJS(ast, context = {}) {
  // return JSON.stringify(ast);
  if (!ast) return "";

  switch (ast.type) {
    case "Module":
      return ast.body.map((stmt) => pythonASTtoJS(stmt, context)).join("\n");

    case "AssignStatement":
      // Проверяем, является ли правая часть вызовом конструктора класса
      if (
        ast.right.type === "CallExpression" &&
        ast.right.callee.type === "Identifier" &&
        isClass(ast.right.callee.name)
      ) {
        return `let ${pythonASTtoJS(ast.left, context)} = new ${pythonASTtoJS(
          ast.right.callee,
          context
        )}(${ast.right.args
          .map((a) => pythonASTtoJS(a, context))
          .join(", ")});`;
      }

      // Определяем, является ли левая часть атрибутом (например, this.name)
      if (ast.left.type === "AttributeAccess") {
        return `${pythonASTtoJS(ast.left, context)} = ${pythonASTtoJS(
          ast.right,
          context
        )};`;
      }

      // В остальных случаях добавляем let
      return `let ${pythonASTtoJS(ast.left, context)} = ${pythonASTtoJS(
        ast.right,
        context
      )};`;

    case "Variable":
      if (context.inMethod && ast.name === "self") {
        return "this";
      }
      return ast.name;

    case "AttributeAccess":
      let objectName = pythonASTtoJS(ast.object, context);
      if (context.inMethod && objectName === "self") {
        objectName = "this";
      }
      return `${objectName}.${ast.attribute}`;

    case "IndexAccess":
      return `${pythonASTtoJS(ast.object, context)}[${pythonASTtoJS(
        ast.index,
        context
      )}]`;

    case "NumberLiteral":
      return ast.value;

    case "StringLiteral":
      return JSON.stringify(ast.value);

    case "PrintStatement":
      return `console.log(${ast.args
        .map((a) => pythonASTtoJS(a, context))
        .join(", ")});`;

    case "BinOp":
      if (ast.op === "**") {
        return `(${pythonASTtoJS(ast.left, context)} ** ${pythonASTtoJS(
          ast.right,
          context
        )})`;
      } else if (ast.op === "//") {
        return `Math.floor(${pythonASTtoJS(
          ast.left,
          context
        )} / ${pythonASTtoJS(ast.right, context)})`;
      } else {
        return `(${pythonASTtoJS(ast.left, context)} ${ast.op} ${pythonASTtoJS(
          ast.right,
          context
        )})`;
      }

    case "MembershipTest":
      if (ast.op === "in") {
        return `${pythonASTtoJS(ast.right, context)}.includes(${pythonASTtoJS(
          ast.left,
          context
        )})`;
      } else if (ast.op === "not in") {
        return `!${pythonASTtoJS(ast.right, context)}.includes(${pythonASTtoJS(
          ast.left,
          context
        )})`;
      }
      return "/* unhandled membership test */";

    case "ListLiteral":
      return `[${ast.elements
        .map((e) => pythonASTtoJS(e, context))
        .join(", ")}]`;

    case "DictLiteral":
      return `{ ${ast.pairs
        .map(
          (p) => `${JSON.stringify(p.key)}: ${pythonASTtoJS(p.value, context)}`
        )
        .join(", ")} }`;

    case "FStringLiteral":
      let parts = ast.segments.map((seg) => {
        if (seg.type === "text") {
          return seg.value.replace(/[`\\]/g, "\\$&"); // Экранирование обратных кавычек и слэшей
        } else if (seg.type === "expr") {
          return `\${${pythonASTtoJS(seg.expr, context)}}`;
        }
      });
      return "`" + parts.join("") + "`";

    case "CallExpression":
      let calleeJS = pythonASTtoJS(ast.callee, context);
      let argsJS = ast.args.map((a) => pythonASTtoJS(a, context)).join(", ");

      // Преобразование методов append в push
      if (
        ast.callee.type === "AttributeAccess" &&
        ast.callee.attribute === "append"
      ) {
        calleeJS = `${pythonASTtoJS(ast.callee.object, context)}.push`;
      }

      // Если вызывается конструктор класса, убедитесь, что используется `new`
      if (isClass(ast.callee.name)) {
        calleeJS = `new ${pythonASTtoJS(ast.callee, context)}`;
      }

      return `${calleeJS}(${argsJS})`;

    case "ClassDef":
      const className = ast.name;
      const classBody = ast.body
        .map((stmt) => {
          if (stmt.type === "FunctionDef") {
            if (stmt.name === "__init__") {
              const params = stmt.args.join(", ");
              const bodyJS = stmt.body
                .map((s) => pythonASTtoJS(s, { inMethod: true, inClass: true }))
                .join("\n    ");
              return `constructor(${params}) {\n    ${bodyJS}\n  }`;
            } else {
              const params = stmt.args.join(", ");
              const bodyJS = stmt.body
                .map((s) => pythonASTtoJS(s, { inMethod: true, inClass: true }))
                .join("\n    ");
              return `${stmt.name}(${params}) {\n    ${bodyJS}\n  }`;
            }
          } else {
            return `/* Unhandled class body node: ${stmt.type} */`;
          }
        })
        .join("\n  ");
      return `class ${className} {\n  ${classBody}\n}\n`;

    case "FunctionDef":
      if (context.inClass) {
        if (ast.name === "__init__") {
          // __init__ уже обрабатывается в ClassDef
          return `/* __init__ handled in ClassDef */`;
        } else {
          const params = ast.args.join(", ");
          const bodyJS = ast.body
            .map((s) => pythonASTtoJS(s, { inMethod: true, inClass: true }))
            .join("\n    ");
          return `${ast.name}(${params}) {\n    ${bodyJS}\n  }`;
        }
      } else {
        const params = ast.args.join(", ");
        const funcBody = ast.body
          .map((s) => pythonASTtoJS(s, context))
          .join("\n  ");
        return `function ${ast.name}(${params}) {\n  ${funcBody}\n}\n`;
      }

    case "IfStatement":
      let ifCode = `if (${pythonASTtoJS(
        ast.condition,
        context
      )}) {\n  ${ast.ifBody
        .map((s) => pythonASTtoJS(s, context))
        .join("\n  ")}\n}`;
      ast.elifClauses?.forEach((elif) => {
        ifCode += ` else if (${pythonASTtoJS(
          elif.condition,
          context
        )}) {\n  ${elif.body
          .map((s) => pythonASTtoJS(s, context))
          .join("\n  ")}\n}`;
      });
      if (ast.elseBody) {
        ifCode += ` else {\n  ${ast.elseBody
          .map((s) => pythonASTtoJS(s, context))
          .join("\n  ")}\n}`;
      }
      return ifCode;

    case "WhileStatement":
      return `while (${pythonASTtoJS(ast.condition, context)}) {\n  ${ast.body
        .map((s) => pythonASTtoJS(s, context))
        .join("\n  ")}\n}`;

    case "ForStatement":
      if (ast.end) {
        return `for (let ${ast.iterator} = ${pythonASTtoJS(
          ast.start,
          context
        )}; ${ast.iterator} < ${pythonASTtoJS(ast.end, context)}; ${
          ast.iterator
        }++) {\n  ${ast.body
          .map((s) => pythonASTtoJS(s, context))
          .join("\n  ")}\n}`;
      } else {
        return `for (let ${ast.iterator} = 0; ${ast.iterator} < ${pythonASTtoJS(
          ast.start,
          context
        )}; ${ast.iterator}++) {\n  ${ast.body
          .map((s) => pythonASTtoJS(s, context))
          .join("\n  ")}\n}`;
      }

    case "TryStatement":
      let tryCode = `try {\n  ${ast.tryBody
        .map((s) => pythonASTtoJS(s, context))
        .join("\n  ")}\n}`;
      if (ast.exceptBody) {
        tryCode += ` catch (e) {\n  ${ast.exceptBody
          .map((s) => pythonASTtoJS(s, context))
          .join("\n  ")}\n}`;
      }
      if (ast.finallyBody) {
        tryCode += ` finally {\n  ${ast.finallyBody
          .map((s) => pythonASTtoJS(s, context))
          .join("\n  ")}\n}`;
      }
      return tryCode;

    case "ReturnStatement":
      if (!ast.argument) return `return;`;
      return `return ${pythonASTtoJS(ast.argument, context)};`;

    // Обработка узлов JavaScript (если есть)
    case "ClassDeclaration":
    case "FunctionDeclaration":
    case "UnknownExpression":
      return `/* Unhandled JS AST node: ${ast.type} */`;

    default:
      return `/* Unhandled Python AST node: ${ast.type} */`;
  }
}

// Функция для проверки, является ли имя классом
function isClass(name) {
  return /^[A-Z]/.test(name); // Предполагается, что имена классов начинаются с заглавной буквы
}
