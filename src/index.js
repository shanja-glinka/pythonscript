import fs from "node:fs/promises";
import path from "node:path";

import { tokenizeJavaScript } from "./core/js/lexer.js";
import { parseJavaScriptTokens } from "./core/js/parser.js";
import { tokenizePython } from "./core/python/lexer.js";
import { parsePythonTokens } from "./core/python/parser.js";
import { executeJS as executeBrowser } from "./runtime/browser.js";
import { executeJS as executeNode } from "./runtime/node.js";
import { jsASTtoPython } from "./transpilers/js2python.js";
import { pythonASTtoJS } from "./transpilers/python2js.js";
import { stdlibHeader } from "./runtime/stdlib.js";

function getExt(inputFile) {
  return path.extname(inputFile).toLowerCase();
}

export async function tokenizeFile(inputFile) {
  const code = await fs.readFile(inputFile, "utf8");
  const ext = getExt(inputFile);

  if (ext === ".pjs") {
    return tokenizePython(code, inputFile);
  }
  if (ext === ".js") {
    return tokenizeJavaScript(code, inputFile);
  }

  throw new Error(`Unsupported extension: ${ext}`);
}

export async function parseFile(inputFile) {
  const ext = getExt(inputFile);
  const tokens = await tokenizeFile(inputFile);

  if (ext === ".pjs") {
    return parsePythonTokens(tokens, inputFile);
  }
  if (ext === ".js") {
    return parseJavaScriptTokens(tokens, inputFile);
  }

  throw new Error(`Unsupported extension: ${ext}`);
}

/**
 * Функция для транспиляции PythonScript
 * @param {string} inputFile - Путь к входному файлу
 * @param {string} outputFile - Путь к выходному файлу
 */
export async function build(inputFile, outputFile, { target = "node" } = {}) {
  try {
    console.log(`Чтение файла: ${inputFile}`);
    const code = await fs.readFile(inputFile, "utf8");
    const ext = getExt(inputFile);

    let outCode = "";

    if (ext === ".pjs") {
      console.log("Транспиляция Python -> JavaScript");
      const tokens = tokenizePython(code, inputFile);
      const ast = parsePythonTokens(tokens, inputFile);
      outCode = pythonASTtoJS(ast);
    } else if (ext === ".js") {
      console.log("Транспиляция JavaScript -> Python");
      const tokens = tokenizeJavaScript(code, inputFile);
      const ast = parseJavaScriptTokens(tokens, inputFile);
      outCode = jsASTtoPython(ast);
    } else {
      throw new Error(`Unsupported extension: ${ext}`);
    }

    // Вычисляем директорию для выходного файла
    const outputDir = path.dirname(outputFile);
    console.log(`Создание директории: ${outputDir}`);

    // Создаём директорию, если она не существует
    await fs.mkdir(outputDir, { recursive: true });

    if (target) {
      outCode = `/* pythonscript target: ${target} */\n${stdlibHeader()}${outCode}`;
    }

    console.log(`Запись выходного файла: ${outputFile}`);
    // Записываем транспилированный код в выходной файл
    await fs.writeFile(outputFile, outCode, "utf8");

    console.log("Транспиляция завершена успешно.");
  } catch (error) {
    throw error;
  }
}

export async function run(
  inputFile,
  { mode = "node", unsafe = false, sandbox = false, timeoutMs = 1000 } = {}
) {
  try {
    if (!unsafe) {
      throw new Error(
        "Execution is disabled by default. Re-run with --unsafe (and optionally --sandbox)."
      );
    }

    console.log(`Чтение файла: ${inputFile}`);
    const code = await fs.readFile(inputFile, "utf8");
    const ext = getExt(inputFile);

    let jsCode = "";

    if (ext === ".pjs") {
      console.log("Транспиляция Python -> JavaScript");
      const tokens = tokenizePython(code, inputFile);
      const ast = parsePythonTokens(tokens, inputFile);
      jsCode = pythonASTtoJS(ast);
    } else if (ext === ".js") {
      console.log("Использование JavaScript напрямую");
      jsCode = code;
    } else {
      throw new Error(`Unsupported extension: ${ext}`);
    }

    console.log(`Выполнение кода в режиме: ${mode}`);
    if (mode === "browser") {
      await executeBrowser(jsCode);
    } else {
      await executeNode(jsCode, { sandbox, timeoutMs });
    }

    console.log("Выполнение завершено успешно.");
  } catch (error) {
    throw error;
  }
}
