import { PScriptError } from "../errors.js";
import { TokenLexer } from "../token-lexer.js";
import { isAlnum, isAlpha, isDigit } from "../utils.js";

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

export function tokenizeJavaScript(code, fileName = "<anonymous>") {
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
    tokens.push(new TokenLexer(type, value, line, col));
  }

  while (pos < code.length) {
    let ch = currentChar();

    // Пробелы, табы, возвраты каретки
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

    // Шаблонные строки (template literals) с обратными кавычками
    if (ch === "`") {
      let strVal = "";
      advance(); // Пропускаем открывающую обратную кавычку
      while (pos < code.length && currentChar() !== "`") {
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
            case "`":
              strVal += "`";
              break;
            case "$":
              strVal += "$";
              break;
            default:
              strVal += escapeChar;
          }
          advance();
        } else if (currentChar() === "$" && code[pos + 1] === "{") {
          // Обработка выражений внутри шаблонных строк
          strVal += "${";
          advance(2); // пропускаем "${"
          // Для упрощения, добавим как часть строки
          // Более сложная обработка потребует вложенного парсера
        } else {
          strVal += currentChar();
          advance();
        }
      }
      if (currentChar() !== "`") {
        throw new PScriptError(
          "Не закрытая шаблонная строка",
          fileName,
          line,
          col
        );
      }
      advance(); // Пропускаем закрывающую обратную кавычку
      addToken("TEMPLATE_STRING", strVal);
      continue;
    }

    // Строки (одинарные, двойные)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let strVal = "";
      advance(); // Пропускаем открывающую кавычку
      while (pos < code.length && currentChar() !== quote) {
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
          advance();
        } else {
          strVal += currentChar();
          advance();
        }
      }
      if (currentChar() !== quote) {
        throw new PScriptError(`Не закрытая строка`, fileName, line, col);
      }
      advance(); // Пропускаем закрывающую кавычку
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
    // =>, ===, ==, !==, !=, <=, >=
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

    // Односимвольные операторы
    if (singleOps.has(ch)) {
      addToken("OP", ch);
      advance();
      continue;
    } else {
    }

    // Если символ не распознан
    throw new PScriptError(`Неизвестный символ '${ch}'`, fileName, line, col);
  }

  return tokens;
}
