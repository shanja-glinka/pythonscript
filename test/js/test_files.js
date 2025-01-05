// Тест: чтение, запись, удаление
// В Node-режиме будет доступ к fs,
// в browser-режиме — либо исключение, либо "виртуальная" fs.

const fs = require("fs");

const filename = "test_output.txt";
const content = "Hello, file system!";

fs.writeFileSync(filename, content);
const read_data = fs.readFileSync(filename, "utf8");
console.log("Read data: ", read_data);

fs.unlinkSync(filename);
try {
    fs.readFileSync(filename, "utf8");
} catch (err) {
    console.log("File doesn't exist, as expected.");
}
