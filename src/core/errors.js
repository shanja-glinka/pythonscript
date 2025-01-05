export class PScriptError extends Error {
  constructor(message, fileName, line, col) {
    super(`${fileName}:${line}:${col}: ${message}`);
    this.name = "PScriptError";
    this.fileName = fileName;
    this.line = line;
    this.col = col;
  }
}
