import { PScriptError } from "./errors.js";
import { isAlnum, isAlpha, isDigit } from "./utils.js";

/**
 * Класс токена, который лексер будет выдавать на выходе.
 * @property {string} type  - тип токена (например, 'NUMBER', 'IDENTIFIER', 'KEYWORD', 'OP', 'STRING', ...)
 * @property {string} value - значение (например, 'if', 'print', '42', '=' и т.д.)
 * @property {number} line  - номер строки, где встретился токен
 * @property {number} col   - номер столбца (позиция символа в строке)
 */
export class Token {
  constructor(type, value, line, col) {
    this.type = type; // 'NUMBER', 'IDENTIFIER', 'KEYWORD', 'OP', 'STRING', etc.
    this.value = value;
    this.line = line;
    this.col = col;
  }
}

// Список ключевых слов Python (упрощённо)
const KEYWORDS = new Set([
  "if",
  "elif",
  "else",
  "for",
  "while",
  "def",
  "class",
  "return",
  "try",
  "except",
  "finally",
  "import",
  "from",
  "as",
  "print", // пусть тоже будет ключевым
  "in",
  "range",
]);

// с KEYWORDS для JS, похожим набором операторов и т.д.

const KEYWORDS_JS = new Set([
  "let",
  "const",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "class",
  "extends",
  "constructor",
  "import",
  "from",
  "export",
  "try",
  "catch",
  "finally",
  "new",
  "this",
  "console",
]);

export function tokenizeJavaScript(code, fileName = "<anonymous>") {
  // Здесь для демонстрации — сделаем "похожий" лексер,

  // Можно было бы сделать общий код и переиспользовать,
  // но ради наглядности здесь скопируем логику
  let pos = 0;
  let line = 1;
  let col = 1;
  const tokens = [];

  function currentChar() {
    return code[pos] || "\0";
  }

  function advance(n = 1) {
    while (n--) {
      if (code[pos] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      pos++;
    }
  }

  function addToken(type, value) {
    tokens.push(new Token(type, value, line, col));
  }

  while (pos < code.length) {
    let ch = currentChar();

    // Пробелы, табы
    if (ch === " " || ch === "\t" || ch === "\r") {
      advance();
      continue;
    }
    // Перенос строки
    if (ch === "\n") {
      advance();
      continue;
    }
    // Комментарии: // и /* ... */
    if (ch === "/" && code[pos + 1] === "/") {
      while (ch && ch !== "\n") {
        advance();
        ch = currentChar();
      }
      continue;
    }
    if (ch === "/" && code[pos + 1] === "*") {
      advance(2);
      while (!(currentChar() === "*" && code[pos + 1] === "/")) {
        if (!currentChar()) {
          throw new PScriptError(
            "Не закрытый комментарий /*",
            fileName,
            line,
            col
          );
        }
        advance();
      }
      advance(2); // закрыли */
      continue;
    }

    // Строки (одинарные, двойные, без экранирования для упрощения)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let strVal = "";
      advance();
      while (pos < code.length && currentChar() !== quote) {
        strVal += currentChar();
        advance();
      }
      if (currentChar() !== quote) {
        throw new PScriptError("Не закрытая строка", fileName, line, col);
      }
      advance(); // пропустить кавычку
      addToken("STRING", strVal);
      continue;
    }

    // Числа
    if (isDigit(ch)) {
      let numStr = "";
      let hasDot = false;
      while (isDigit(currentChar()) || currentChar() === ".") {
        if (currentChar() === ".") {
          if (hasDot) break;
          hasDot = true;
        }
        numStr += currentChar();
        advance();
      }
      addToken("NUMBER", numStr);
      continue;
    }

    // Идентификаторы
    if (isAlpha(ch)) {
      let ident = "";
      while (isAlnum(currentChar())) {
        ident += currentChar();
        advance();
      }
      // Проверяем ключевое слово
      if (KEYWORDS_JS.has(ident)) {
        addToken("KEYWORD", ident);
      } else {
        addToken("IDENTIFIER", ident);
      }
      continue;
    }

    // Операторы
    // =, ==, ===, =>, <=, >=, !=, !==, ++, --, +, -, ...
    // Здесь можно долго перечислять. Для примера:
    // Проверим => (стрелочные функции)
    if (ch === "=" && code[pos + 1] === ">") {
      addToken("OP", "=>");
      advance(2);
      continue;
    }
    if (ch === "=" && code[pos + 1] === "=" && code[pos + 2] === "=") {
      addToken("OP", "===");
      advance(3);
      continue;
    }
    if (ch === "=" && code[pos + 1] === "=") {
      addToken("OP", "==");
      advance(2);
      continue;
    }
    if (ch === "!" && code[pos + 1] === "=" && code[pos + 2] === "=") {
      addToken("OP", "!==");
      advance(3);
      continue;
    }
    if (ch === "!" && code[pos + 1] === "=") {
      addToken("OP", "!=");
      advance(2);
      continue;
    }
    if (ch === "<" && code[pos + 1] === "=") {
      addToken("OP", "<=");
      advance(2);
      continue;
    }
    if (ch === ">" && code[pos + 1] === "=") {
      addToken("OP", ">=");
      advance(2);
      continue;
    }

    // Односимвольные
    const singleOps = new Set([
      "+",
      "-",
      "*",
      "/",
      "%",
      "=",
      "<",
      ">",
      "(",
      ")",
      "[",
      "]",
      "{",
      "}",
      ",",
      ".",
      ";",
      "!",
      ":",
      "?",
    ]);
    if (singleOps.has(ch)) {
      addToken("OP", ch);
      advance();
      continue;
    }

    throw new PScriptError(`Неизвестный символ '${ch}'`, fileName, line, col);
  }

  return tokens;
}


/**
 * Упрощённый лексер для Python-файла (.pjs).
 * Проходит по коду посимвольно, формирует токены.
 * @param {string} code     - исходный код (содержимое файла .pjs)
 * @param {string} fileName - имя файла (для ошибок)
 * @returns {Token[]}       - массив токенов
 */
export function tokenizePython(code, fileName = "<anonymous>") {
  let pos = 0;
  let line = 1;
  let col = 1;

  const tokens = [];

  /**
   * Возвращает текущий символ (или '\0', если вышли за конец).
   */
  function currentChar() {
    return code[pos] || "\0";
  }

  /**
   * Сдвигаемся на n символов вперёд, обновляя line/col.
   */
  function advance(n = 1) {
    while (n--) {
      if (code[pos] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      pos++;
    }
  }

  /**
   * Вспомогательная функция: добавить токен в массив.
   */
  function addToken(type, value) {
    tokens.push(new Token(type, value, line, col));
  }

  // Основной цикл лексера
  while (pos < code.length) {
    let ch = currentChar();

    // Пробелы, табы
    if (ch === " " || ch === "\t" || ch === "\r") {
      advance();
      continue;
    }

    // Перенос строки
    if (ch === "\n") {
      advance();
      // Можем при желании добавить токен NEWLINE, но чаще его пропускают
      continue;
    }

    // Комментарий (начинается с #, до конца строки)
    if (ch === "#") {
      while (ch && ch !== "\n") {
        advance();
        ch = currentChar();
      }
      continue; // пропустили комментарий
    }

    // Строка (упрощённая версия: без экранирования)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let strVal = "";
      advance(); // пропускаем открытую кавычку
      while (pos < code.length && currentChar() !== quote) {
        strVal += currentChar();
        advance();
      }
      if (currentChar() !== quote) {
        throw new PScriptError("Не закрытая строка", fileName, line, col);
      }
      advance(); // пропустить закрывающую кавычку
      addToken("STRING", strVal);
      continue;
    }

    // Число (целое или с плавающей точкой)
    if (isDigit(ch)) {
      let numStr = "";
      let hasDot = false;
      while (isDigit(currentChar()) || currentChar() === ".") {
        if (currentChar() === ".") {
          if (hasDot) break; // вторая точка — выходим
          hasDot = true;
        }
        numStr += currentChar();
        advance();
      }
      addToken("NUMBER", numStr);
      continue;
    }

    // Идентификатор или ключевое слово
    if (isAlpha(ch)) {
      let ident = "";
      while (isAlnum(currentChar())) {
        ident += currentChar();
        advance();
      }
      if (KEYWORDS.has(ident)) {
        addToken("KEYWORD", ident);
      } else {
        addToken("IDENTIFIER", ident);
      }
      continue;
    }

    // Многосимвольные операторы: //, **, ==, !=, <=, >=
    if (ch === "/" && code[pos + 1] === "/") {
      addToken("OP", "//");
      advance(2);
      continue;
    }
    if (ch === "*" && code[pos + 1] === "*") {
      addToken("OP", "**");
      advance(2);
      continue;
    }
    if (ch === "=" && code[pos + 1] === "=") {
      addToken("OP", "==");
      advance(2);
      continue;
    }
    if (ch === "!" && code[pos + 1] === "=") {
      addToken("OP", "!=");
      advance(2);
      continue;
    }
    if (ch === "<" && code[pos + 1] === "=") {
      addToken("OP", "<=");
      advance(2);
      continue;
    }
    if (ch === ">" && code[pos + 1] === "=") {
      addToken("OP", ">=");
      advance(2);
      continue;
    }

    // Односимвольные операторы и разделители
    const singleOps = new Set([
      "+",
      "-",
      "*",
      "/",
      "%",
      "=",
      "<",
      ">",
      "(",
      ")",
      "[",
      "]",
      "{",
      "}",
      ":",
      ",",
      ".",
    ]);
    if (singleOps.has(ch)) {
      addToken("OP", ch);
      advance();
      continue;
    }

    // Если дошли сюда — неизвестный символ
    throw new PScriptError(`Неизвестный символ '${ch}'`, fileName, line, col);
  }

  // Возвращаем готовый список токенов
  return tokens;
}
