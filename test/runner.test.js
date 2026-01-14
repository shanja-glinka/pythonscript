// runner.test.js (ESM)
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// Simple synchronous smoke test. Extend with more cases as needed.
function runCommand(command, cwd = process.cwd()) {
  try {
    return execSync(command, { cwd, stdio: "pipe" }).toString();
  } catch (e) {
    throw new Error(e.stderr ? e.stderr.toString() : e.message);
  }
}

function cleanup() {
  const outDir = path.join(process.cwd(), "test_build");
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}

cleanup();

try {
  console.log("=== Тест #1: test_scalars.pjs -> JS -> run ===");

  runCommand(
    `node bin/pythonscript build test/pjs/test_scalars.pjs -o test_build/test_scalars.out.js`
  );

  const output = runCommand(`node test_build/test_scalars.out.js`);
  console.log("Вывод:", output);

  assert.ok(output.includes("13"), "Не найдено число 13 в выводе test_scalars");
  assert.ok(output.includes("Done!"), "Не найдено 'Done!' в выводе test_scalars");

  console.log("=== Успешно: test_scalars.pjs ===\n");
} catch (err) {
  console.error("ОШИБКА в test_scalars.pjs:", err);
  process.exit(1);
} finally {
  cleanup();
}

// Дополнить дополнительными кейсами js->pjs при расширении покрытия.
console.log("Все тесты пройдены!");
