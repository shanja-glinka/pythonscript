import fs from "node:fs/promises";
import path from "node:path";

import { tokenizePython, tokenizeJavaScript } from "./core/lexer.js";
import { pythonASTtoJS } from "./transpilers/python2js.js";
import { jsASTtoPython } from "./transpilers/js2python.js";
import { executeJS as executeBrowser } from "./runtime/browser.js";
import { executeJS as executeNode } from "./runtime/node.js";
import { parseJavaScriptTokens } from "./core/parsers/jsparser.js";
import { parsePythonTokens } from "./core/parser.js";

/**
 * Функция для транспиляции PythonScript
 * @param {string} inputFile - Путь к входному файлу
 * @param {string} outputFile - Путь к выходному файлу
 */
export async function build(inputFile, outputFile) {
  try {
    console.log(`Чтение файла: ${inputFile}`);
    const code = await fs.readFile(inputFile, "utf8");
    const ext = path.extname(inputFile).toLowerCase();

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
      throw new Error(`Неизвестное расширение: ${ext}`);
    }

    // Вычисляем директорию для выходного файла
    const outputDir = path.dirname(outputFile);
    console.log(`Создание директории: ${outputDir}`);

    // Создаём директорию, если она не существует
    await fs.mkdir(outputDir, { recursive: true });

    console.log(`Запись выходного файла: ${outputFile}`);
    // Записываем транспилированный код в выходной файл
    await fs.writeFile(outputFile, outCode, "utf8");

    console.log("Транспиляция завершена успешно.");
  } catch (error) {
    throw error;
  }
}

export async function run(inputFile, { mode = "node" } = {}) {
  try {
    console.log(`Чтение файла: ${inputFile}`);
    const code = await fs.readFile(inputFile, "utf8");
    const ext = path.extname(inputFile).toLowerCase();

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
      throw new Error(`Неизвестное расширение: ${ext}`);
    }

    console.log(`Выполнение кода в режиме: ${mode}`);
    if (mode === "browser") {
      await executeBrowser(jsCode);
    } else {
      await executeNode(jsCode);
    }

    console.log("Выполнение завершено успешно.");
  } catch (error) {
    throw error;
  }
}
