// Проверка базовых операций и try/catch/finally

let a = 10;
let b = 3;

console.log(a + b);  // 13
console.log(a - b);  // 7
console.log(a * b);  // 30
console.log(a / b);  // 3.3333...
console.log(a ** b); // 1000 (возведение в степень)

try {
    let c = Math.floor(a / b);
    let d = a % b;
    console.log(c, d); // 3 1
} catch (e) {
    console.log("Error!");
} finally {
    console.log("Done!");
}

// Пример простых условий
if (a > b) {
    console.log("a больше b");
} else {
    console.log("a меньше или равно b");
}

// Работа с массивами
let arr = [1, 2, 3];
console.log("Изначальный массив:", arr);
arr.push(4);
console.log("После добавления элемента:", arr);
arr.pop();
console.log("После удаления последнего элемента:", arr);

console.log("Массив содержит '2'? ->", arr.includes(2));

// Работа с объектом
let obj = { x: 10, y: 20 };
console.log("Сумма obj.x + obj.y =", obj.x + obj.y);

// Небольшая функция для сравнения значений
function compareValues(x, y) {
    if (x > y) {
        console.log(`${x} > ${y}`);
    } else if (x < y) {
        console.log(`${x} < ${y}`);
    } else {
        console.log(`${x} == ${y}`);
    }
}

compareValues(5, 3);  // 5 > 3
compareValues(3, 5);  // 3 < 5
compareValues(4, 4);  // 4 == 4

// Пример простого класса
class Person {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }
    sayHello() {
        console.log(`Hello, my name is ${this.name}, I am ${this.age} years old.`);
    }
}

const person = new Person("Alice", 25);
person.sayHello(); // Hello, my name is Alice, I am 25 years old.
