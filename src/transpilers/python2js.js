export function pythonASTtoJS(ast) {
  if (!ast) return "";

  switch (ast.type) {
    case "Module":
      // ast.body - массив инструкций
      return ast.body.map((stmt) => pythonASTtoJS(stmt)).join("\n");

    case "AssignStatement":
      // ast.left, ast.right
      // Превращаем левую часть в JS, правую часть в JS:
      return `${pythonASTtoJS(ast.left)} = ${pythonASTtoJS(ast.right)};`;

    case "Variable":
      // ast.name
      return ast.name; // например "a" → "a"

    case "AttributeAccess":
      // ast.object, ast.attribute
      // object может быть Variable("self"), attribute = "name"
      // => "self.name"
      return `${pythonASTtoJS(ast.object)}.${ast.attribute}`;

    case "IndexAccess":
      // obj[index]
      // ast.object, ast.index
      return `${pythonASTtoJS(ast.object)}[${pythonASTtoJS(ast.index)}]`;

    case "NumberLiteral":
      return ast.value; // "10"
    case "StringLiteral":
      // оборачиваем в кавычки
      return JSON.stringify(ast.value);

    case "PrintStatement":
      // ast.args - массив выражений
      // В JS - console.log(...)
      // Собираем args -> string
      // Но вы хотите parse them?
      // Простейший вариант:
      return `console.log(${ast.args.map((a) => pythonASTtoJS(a)).join(", ")})`;

    case "BinOp":
      // ast.op, ast.left, ast.right
      // +, -, *, /, //, %, **, <, >, ...
      if (ast.op === "**") {
        // JS тоже умеет **
        return `(${pythonASTtoJS(ast.left)} ** ${pythonASTtoJS(ast.right)})`;
      } else if (ast.op === "//") {
        // integer division -> Math.floor(left / right)
        return `Math.floor(${pythonASTtoJS(ast.left)} / ${pythonASTtoJS(
          ast.right
        )})`;
      } else {
        return `(${pythonASTtoJS(ast.left)} ${ast.op} ${pythonASTtoJS(
          ast.right
        )})`;
      }

    case "MembershipTest":
      // op: 'in' или 'not in'
      // Python: x in arr
      // JS: arr.includes(x)
      // => flip left/right
      if (ast.op === "in") {
        return `${pythonASTtoJS(ast.right)}.includes(${pythonASTtoJS(
          ast.left
        )})`;
      } else if (ast.op === "not in") {
        return `!${pythonASTtoJS(ast.right)}.includes(${pythonASTtoJS(
          ast.left
        )})`;
      }
      return "/* unhandled membership test */";

    case "ListLiteral":
      // ast.elements - массив
      // Превращаем в JS массив [ ... ]
      return `[${ast.elements.map((e) => pythonASTtoJS(e)).join(", ")}]`;

    case "DictLiteral":
      // Псевдо: { x: 10, y: 20 }
      // ast.pairs = [ {key, value}, ... ]
      // key - string or identifier
      return `{ ${ast.pairs
        .map((p) => {
          const k = p.key; // string or identifier name
          const v = pythonASTtoJS(p.value);
          // Если key - identifier, we do `key: v`,
          // if string: `'key': v`. Up to you
          return `${JSON.stringify(k)}: ${v}`;
        })
        .join(", ")} }`;

    case "FStringLiteral":
      // ast.segments = [ {type: "text", value: ...}, {type:"expr", expr:...}, ...]
      // Convert to template string with backticks
      let parts = [];
      for (let seg of ast.segments) {
        if (seg.type === "text") {
          parts.push(seg.value.replace(/`/g, "\\`")); // escape backticks
        } else if (seg.type === "expr") {
          const exprJS = pythonASTtoJS(seg.expr);
          parts.push(`\${${exprJS}}`);
        }
      }
      return "`" + parts.join("") + "`";

    case "CallExpression":
      // ast.callee, ast.args
      // Example: arr.append(4)
      // Maybe you map arr.append -> arr.push
      // or just do console.log(...) if callee is console.log
      //
      // Minimal version: callee(args)
      // e.g. `foo(1,2)`
      let calleeJS = pythonASTtoJS(ast.callee);
      let argsJS = ast.args.map((a) => pythonASTtoJS(a)).join(", ");
      // If it's arr.append(...) => arr.push(...)
      // pseudo-check:
      if (
        ast.callee.type === "AttributeAccess" &&
        ast.callee.attribute === "append"
      ) {
        // transform: arr.append(...) -> arr.push(...)
        calleeJS = pythonASTtoJS(ast.callee.object) + ".push";
      }
      return `${calleeJS}(${argsJS})`;

    case "ClassDef":
      // For a minimal approach, e.g. `class Foo { constructor() { ... } }`
      // or you can skip details
      return `class ${ast.name} {\n  constructor() {\n    // TODO: init\n  }\n}\n`;

    case "FunctionDef":
      // def foo(a,b): ...
      // -> function foo(a,b) { ... }
      let params = ast.args.join(", ");
      let funcBody = ast.body.map((s) => pythonASTtoJS(s)).join("\n");
      return `function ${ast.name}(${params}) {\n${funcBody}\n}`;

    case "IfStatement":
      // ast.condition, ast.ifBody, ast.elifClauses, ast.elseBody
      const condJS = pythonASTtoJS(ast.condition);
      const ifBodyJS = ast.ifBody.map((s) => pythonASTtoJS(s)).join("\n");
      let code = `if (${condJS}) {\n${ifBodyJS}\n}`;
      // elif:
      for (const elif of ast.elifClauses || []) {
        const elifCondJS = pythonASTtoJS(elif.condition);
        const elifBodyJS = elif.body.map((s) => pythonASTtoJS(s)).join("\n");
        code += ` else if (${elifCondJS}) {\n${elifBodyJS}\n}`;
      }
      // else
      if (ast.elseBody) {
        const elseJS = ast.elseBody.map((s) => pythonASTtoJS(s)).join("\n");
        code += ` else {\n${elseJS}\n}`;
      }
      return code;

    case "WhileStatement":
      // while <condition> { body }
      const wCondJS = pythonASTtoJS(ast.condition);
      const wBodyJS = ast.body.map((s) => pythonASTtoJS(s)).join("\n");
      return `while (${wCondJS}) {\n${wBodyJS}\n}`;

    case "ForStatement":
      // for i in range(a, b)
      // in JS => for (let i = a; i < b; i++)
      // if end=null => for (let i=0; i<a; i++)
      if (ast.end) {
        return `for (let ${ast.iterator} = ${ast.start}; ${ast.iterator} < ${
          ast.end
        }; ${ast.iterator}++) {\n${ast.body
          .map((s) => pythonASTtoJS(s))
          .join("\n")}\n}`;
      } else {
        return `for (let ${ast.iterator} = 0; ${ast.iterator} < ${ast.start}; ${
          ast.iterator
        }++) {\n${ast.body.map((s) => pythonASTtoJS(s)).join("\n")}\n}`;
      }

    case "TryStatement":
      // tryBody, exceptBody, finallyBody
      let tCode = `try {\n${ast.tryBody
        .map((s) => pythonASTtoJS(s))
        .join("\n")}\n}`;
      if (ast.exceptBody) {
        tCode += ` catch (e) {\n${ast.exceptBody
          .map((s) => pythonASTtoJS(s))
          .join("\n")}\n}`;
      }
      if (ast.finallyBody) {
        tCode += ` finally {\n${ast.finallyBody
          .map((s) => pythonASTtoJS(s))
          .join("\n")}\n}`;
      }
      return tCode;

    case "ReturnStatement":
      if (!ast.argument) return "return;";
      return `return ${pythonASTtoJS(ast.argument)};`;

    case "ClassDeclaration":
    case "FunctionDeclaration":
    case "UnknownExpression":
      // ... etc. (JS side) ...
      return `/* Unhandled JS AST node: ${ast.type} */`;

    default:
      return `/* Unhandled Python AST node: ${ast.type} */`;
  }
}
