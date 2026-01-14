import { PScriptError } from "./errors.js";

/**
 * Простейшая обёртка для итерации по массиву токенов.
 */
export class TokenStream {
  constructor(tokens, fileName = "<anonymous>") {
    this.tokens = tokens;
    this.pos = 0;
    this.fileName = fileName;
    this.indentStack = [0]; // Начальный уровень отступа
  }

  current() {
    return this.tokens[this.pos] || null;
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset] || null;
  }

  next() {
    const token = this.current();
    if (token && token.type === "INDENT") {
      this.indentStack.push(token.value); // Предполагается, что token.value содержит уровень отступа
    } else if (token && token.type === "DEDENT") {
      if (this.indentStack.length === 1) {
        throw new PScriptError(
          "Лишний DEDENT",
          this.fileName,
          token.line,
          token.col
        );
      }
      this.indentStack.pop();
    }
    this.pos++;
    return this.current();
  }

  expect(type, value = null) {
    const token = this.current();
    if (!token) {
      throw new PScriptError(
        `Ожидался токен ${type}${
          value ? " " + value : ""
        }, но достигнут конец файла`,
        this.fileName,
        0,
        0
      );
    }
    if (token.type !== type || (value && token.value !== value)) {
      throw new PScriptError(
        `Ожидался токен ${type}${value ? " " + value : ""}, а найден ${
          token.type
        } ${token.value}`,
        this.fileName,
        token.line,
        token.col
      );
    }
    this.next();
    return token;
  }

  isAtEnd() {
    return this.current() === null;
  }

  getCurrentIndent() {
    return this.indentStack[this.indentStack.length - 1];
  }
}
