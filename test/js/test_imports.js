// Предположим, у нас есть файл mylib.js с простой функцией.
// Для удобства используем CommonJS (Node) или ESM.
// Здесь - CommonJS:

const mylib = require("./mylib.js");

console.log(mylib.hello_world());

// Проверяем другой способ импорта (деструктуризация)
const { sum_two } = require("./mylib.js");
console.log(sum_two(2, 3));
