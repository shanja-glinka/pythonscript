// runner.test.js
const { execSync } = require("child_process");
const assert = require("assert");
const path = require("path");

// Это простая демонстрация проверки.
// В реальном проекте нужны полноценные мок/спай/тай, логирование, etc.

function runCommand(command, cwd = process.cwd()) {
  try {
    return execSync(command, { cwd, stdio: "pipe" }).toString();
  } catch (e) {
    throw new Error(e.stderr ? e.stderr.toString() : e.message);
  }
}

// Пример простого теста для test_scalars.pjs
try {
  console.log("=== Тест #1: test_scalars.pjs -> JS -> run ===");

  // 1) Транспиляция test_scalars.pjs -> test_scalars.out.js (выходной файл)
  //    Допустим, у нас есть CLI-утилита: pythonscript build <input> -o <output>
  //    или аналогичный вариант. Здесь — примерный вызов:
  runCommand(
    `node bin/pythonscript build test/pjs/test_scalars.pjs -o test_build/test_scalars.out.js`
  );

  // 2) Запуск полученного .js и проверка вывода
  const output = runCommand(`node test_build/test_scalars.out.js`);
  console.log("Вывод:", output);

  // Можно сделать грубую проверку:
  assert.ok(output.includes("13"), "Не найдено число 13 в выводе test_scalars");
  assert.ok(output.includes("Done!"), "Не найдено 'Done!' в выводе test_scalars");

  console.log("=== Успешно: test_scalars.pjs ===\n");
} catch (err) {
  console.error("ОШИБКА в test_scalars.pjs:", err);
  process.exit(1);
}

// Аналогично делаем для остальных pjs->js, js->pjs и т.д.
// ...

// Если мы дошли сюда, значит всё ОК
console.log("Все тесты пройдены!");
