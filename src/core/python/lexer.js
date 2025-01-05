import { PScriptError } from "../errors.js";
import { TokenLexer } from "../token-lexer.js";
import { isAlnum, isAlpha } from "../utils.js";

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
    tokens.push(new TokenLexer(type, value, line, col));
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
        throw new PScriptError(
          `Некорректный отступ на линии ${line}, колонка ${col}`
        );
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
        throw new PScriptError(
          `Не закрытая строка на линии ${line}, колонка ${col}`
        );
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
