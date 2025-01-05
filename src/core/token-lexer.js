/**
 * Класс токена, который лексер будет выдавать на выходе.
 * @property {string} type  - тип токена (например, 'NUMBER', 'IDENTIFIER', 'KEYWORD', 'OP', 'STRING', ...)
 * @property {string} value - значение (например, 'if', 'print', '42', '=' и т.д.)
 * @property {number} line  - номер строки, где встретился токен
 * @property {number} col   - номер столбца (позиция символа в строке)
 */
export class TokenLexer {
  constructor(type, value, line, col) {
    this.type = type; // 'NUMBER', 'IDENTIFIER', 'KEYWORD', 'OP', 'STRING', etc.
    this.value = value;
    this.line = line;
    this.col = col;
  }
}
