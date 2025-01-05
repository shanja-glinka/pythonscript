import { PScriptError } from "./errors.js";

/**
 * Простейшая обёртка для итерации по массиву токенов.
 */
export class TokenStream {
  constructor(tokens, fileName = "<anonymous>") {
    this.tokens = tokens;
    this.pos = 0;
    this.fileName = fileName;
  }

  current() {
    return this.tokens[this.pos] || null;
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset] || null;
  }

  next() {
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
}