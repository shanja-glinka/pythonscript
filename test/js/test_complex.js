// Тест сложных операторов: циклы, условия, комментарии

function factorial(n) {
    let result = 1;
    for (let i = 1; i <= n; i++) {
        result *= i;
    }
    return result;
}

let x = 5;
if (x > 0) {
    console.log(factorial(x));
} else {
    console.log("x is not positive");
}

// Проверка цикла while
let y = 0;
while (y < 5) {
    console.log("y =", y);
    y++;
}
