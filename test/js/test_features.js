// JS аналог feature-теста: срезы через slice, логические операторы, тернарник, расширенные присваивания

let arr = [1, 2, 3, 4, 5];
console.log("slice1", arr.slice(1, 3));
console.log("slice2", arr.slice(0, 2));
console.log("slice3", arr.slice(3));

let x = 1;
x += 2;
console.log("x", x);

let flag = true && !false || false;
console.log("flag", flag);

let val = x > 2 ? 5 : 0;
console.log("val", val);

let noneVal = null;
console.log("none", noneVal);
