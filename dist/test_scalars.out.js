let a = 10;
let b = 3;
console.log((a + b));
console.log((a - b));
console.log((a * b));
console.log((a / b));
console.log((a ** b));
try {
  let c = Math.floor(a / b);
  let d = (a % b);
  console.log(c, d);
  let n = (h / 0);
} catch (e) {
  console.log("Error!");
} finally {
  console.log("Done!");
}
if ((a > b)) {
  console.log("a больше b");
} else {
  console.log("a меньше или равно b");
}
let arr = [1, 2, 3];
console.log("Изначальный массив:", arr);
arr.push(4)
console.log("После добавления элемента:", arr);
arr.pop()
console.log("После удаления последнего элемента:", arr);
console.log("Массив содержит '2'? ->", arr.includes(2));
let obj = { "x": 10, "y": 20 };
console.log("Сумма obj.x + obj.y =", (obj["x"] + obj["y"]));
function compare_values(x, y) {
  if ((x > y)) {
  console.log("Результат:", "{x} > {y}");
  console.log(`${x} > ${y}`);
} else if ((x < y)) {
  console.log(`${x} < ${y}`);
} else {
  console.log(`${x} == ${y}`);
}
}

compare_values(5, 3)
compare_values(3, 5)
compare_values(4, 4)
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  say_hello() {
    console.log(`Hello, my name is ${this.name}, I am ${this.age} years old.`);
  }
}

let person = new Person("Alice", 25);
person.say_hello()