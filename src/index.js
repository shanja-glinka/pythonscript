import fs from "node:fs";
import path from "node:path";

import { tokenizePython, tokenizeJavaScript } from "./core/lexer.js";
import { parsePythonTokens, parseJavaScriptTokens } from "./core/parser.js";
import { pythonASTtoJS } from "./transpilers/python2js.js";
import { jsASTtoPython } from "./transpilers/js2python.js";
import { executeJS as executeBrowser } from "./runtime/browser.js";
import { executeJS as executeNode } from "./runtime/node.js";

export async function build(inputFile, outputFile) {
  const code = fs.readFileSync(inputFile, "utf8");
  const ext = path.extname(inputFile).toLowerCase();

  let outCode = "";

  if (ext === ".pjs") {
    // Python -> JS
    const tokens = tokenizePython(code, inputFile);
    const ast = parsePythonTokens(tokens, inputFile);
    outCode = pythonASTtoJS(ast);
  } else if (ext === ".js") {
    // JS -> Python
    const tokens = tokenizeJavaScript(code, inputFile);
    const ast = parseJavaScriptTokens(tokens, inputFile);
    outCode = jsASTtoPython(ast);
  } else {
    throw new Error(`Неизвестное расширение: ${ext}`);
  }

  fs.writeFileSync(outputFile, outCode, "utf8");
}

export async function run(inputFile, { mode = "node" } = {}) {
  const code = fs.readFileSync(inputFile, "utf8");
  const ext = path.extname(inputFile).toLowerCase();

  let jsCode = "";

  if (ext === ".pjs") {
    // Транспилируем Python -> JS
    const tokens = tokenizePython(code, inputFile);
    const ast = parsePythonTokens(tokens, inputFile);
    jsCode = pythonASTtoJS(ast);
  } else if (ext === ".js") {
    // Если уже JS, просто используем как есть
    jsCode = code;
  } else {
    throw new Error(`Неизвестное расширение: ${ext}`);
  }

  if (mode === "browser") {
    executeBrowser(jsCode);
  } else {
    executeNode(jsCode);
  }
}
