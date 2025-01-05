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
    tokens.push(new TokenLexer(type, value, line, col));
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
