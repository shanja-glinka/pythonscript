a = 10;
b = 3;
console.log((a + b))
console.log((a - b))
console.log((a * b))
console.log((a / b))
console.log((a ** b))
try {
c = Math.floor(a / b);
d = (a % b);
console.log(c, d)
} catch (e) {
console.log("Error!")
} finally {
console.log("Done!")
if ((a > b)) {
console.log("a больше b")
} else {

}
console.log("a меньше или равно b")
arr = [1, 2, 3];
console.log("Изначальный массив:", arr)
arr.push(4)
console.log("После добавления элемента:", arr)
arr.pop()
console.log("После удаления последнего элемента:", arr)
console.log("Массив содержит '2'? ->", arr.includes(2))
obj = { "x": 10, "y": 20 };
console.log("Сумма obj.x + obj.y =", (obj["x"] + obj["y"]))
function compare_values(x, y) {

}
if ((x > y)) {
console.log("Результат:", "{x} > {y}")
console.log(`${x} > ${y}`)
} else if ((x < y)) {
console.log(`${x} < ${y}`)
} else {

}
console.log(`${x} == ${y}`)
compare_values(5, 3)
compare_values(3, 5)
compare_values(4, 4)
class Person {
  constructor() {
    // TODO: init
  }
}

function __init__(self, name, age) {
self.name = name;
self.age = age;
}
function say_hello(self) {

}
console.log(`Hello, my name is ${self.name}, I am ${self.age} years old.`)
person = Person("Alice", 25);
person.say_hello()
}