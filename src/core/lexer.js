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

const SINGLE_OPS = new Set([
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
  "**",
  "//",
  "==",
  "!=",
  "<=",
  ">=",
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
 * Лексер для Python-файла (.pjs).
 * Проходит по коду посимвольно, формирует токены.
 * @param {string} code      - исходный код (содержимое файла .pjs)
 * @param {string} fileName  - имя файла (для ошибок)
 * @returns {Token[]}        - массив токенов
 */
export function tokenizePython(code, fileName = "<anonymous>") {
  let pos = 0;
  let line = 1;
  let col = 1;

  const tokens = [];
  const indentStack = [0]; // Начальный уровень отступа

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
    while (n-- && pos < code.length) {
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
   * Добавляет токен в массив.
   */
  function addToken(type, value) {
    tokens.push(new Token(type, value, line, col));
  }

  function handleIndentation() {
    let start = pos;
    let currentLine = "";
    while (currentChar() === " " || currentChar() === "\t") {
      currentLine += currentChar();
      advance();
    }

    // Если строка пустая или комментарий, игнорируем отступ
    if (
      currentChar() === "\n" ||
      currentChar() === "#" ||
      currentChar() === "\0"
    ) {
      return;
    }

    const indentLevel = currentLine.replace(/\t/g, "    ").length; // Преобразуем табы в 4 пробела

    if (indentLevel > indentStack[indentStack.length - 1]) {
      indentStack.push(indentLevel);
      addToken("INDENT", "");
    } else {
      while (indentLevel < indentStack[indentStack.length - 1]) {
        indentStack.pop();
        addToken("DEDENT", "");
      }
      if (indentLevel !== indentStack[indentStack.length - 1]) {
        throw new PScriptError(`Некорректный отступ на линии ${line}, колонка ${col}`);
      }
    }
  }

  // Основной цикл лексера
  while (pos < code.length) {
    let ch = currentChar();

    // Обработка новых строк
    if (ch === "\n") {
      addToken("NEWLINE", "\n");
      advance();
      handleIndentation();
      continue;
    }

    // Пробелы и табы (пропускаем, если не в начале строки)
    if (ch === " " || ch === "\t" || ch === "\r") {
      advance();
      continue;
    }

    // Комментарий (начинается с #, до конца строки)
    if (ch === "#") {
      while (ch && ch !== "\n") {
        advance();
        ch = currentChar();
      }
      continue; // Пропустили комментарий
    }

    // f-строки
    if (ch === "f" && (code[pos + 1] === '"' || code[pos + 1] === "'")) {
      const quoteType = code[pos + 1];
      let strVal = "";
      advance(2); // Пропускаем 'f' и открывающую кавычку
      while (pos < code.length && currentChar() !== quoteType) {
        if (currentChar() === "\\") {
          // Обработка экранирования
          advance();
          const escapeChar = currentChar();
          switch (escapeChar) {
            case "n":
              strVal += "\n";
              break;
            case "t":
              strVal += "\t";
              break;
            case "\\":
              strVal += "\\";
              break;
            case '"':
              strVal += '"';
              break;
            case "'":
              strVal += "'";
              break;
            default:
              strVal += escapeChar;
          }
        } else {
          strVal += currentChar();
        }
        advance();
      }
      if (currentChar() !== quoteType) {
        throw new PScriptError(
          `Не закрытая f-строка на линии ${line}, колонка ${col}`
        );
      }
      advance(); // Пропускаем закрывающую кавычку

      addToken("FSTRING", strVal);
      continue;
    }

    // Строки
    if (ch === '"' || ch === "'") {
      const quoteType = ch;
      let strVal = "";
      advance(); // Пропускаем открывающую кавычку
      while (pos < code.length && currentChar() !== quoteType) {
        if (currentChar() === "\\") {
          // Обработка экранирования
          advance();
          const escapeChar = currentChar();
          switch (escapeChar) {
            case "n":
              strVal += "\n";
              break;
            case "t":
              strVal += "\t";
              break;
            case "\\":
              strVal += "\\";
              break;
            case '"':
              strVal += '"';
              break;
            case "'":
              strVal += "'";
              break;
            default:
              strVal += escapeChar;
          }
        } else {
          strVal += currentChar();
        }
        advance();
      }
      if (currentChar() !== quoteType) {
        throw new PScriptError(`Не закрытая строка на линии ${line}, колонка ${col}`);
      }
      advance(); // Пропускаем закрывающую кавычку
      addToken("STRING", strVal);
      continue;
    }

    // Числа
    if (/\d/.test(ch)) {
      let numStr = "";
      while (/\d/.test(currentChar()) || currentChar() === ".") {
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

    // Многосимвольные операторы
    const twoCharOps = new Set(["//", "**", "==", "!=", "<=", ">="]);
    const threeCharOps = new Set(); // В Python нет трехсимвольных операторов по умолчанию
    let op = code.slice(pos, pos + 3);
    if (threeCharOps.has(op)) {
      addToken("OP", op);
      advance(3);
      continue;
    }
    op = code.slice(pos, pos + 2);
    if (twoCharOps.has(op)) {
      addToken("OP", op);
      advance(2);
      continue;
    }

    // Односимвольные операторы
    if (SINGLE_OPS.has(ch)) {
      addToken("OP", ch);
      advance();
      continue;
    }

    // Если символ не распознан
    throw new PScriptError(
      `Неизвестный символ '${ch}' на линии ${line}, колонка ${col}`
    );
  }

  // Добавляем DEDENT токены до базового уровня
  while (indentStack.length > 1) {
    indentStack.pop();
    addToken("DEDENT", "");
  }

  return tokens;
}
