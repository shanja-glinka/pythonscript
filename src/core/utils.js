// Простейшие функции для проверки типов символов и т.д.
export function isAlpha(ch) {
  return /^[A-Za-z_]$/.test(ch);
}

export function isDigit(ch) {
  return /^[0-9]$/.test(ch);
}

export function isAlnum(ch) {
  return /^[A-Za-z0-9_]$/.test(ch);
}
