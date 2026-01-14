import test from "node:test";
import assert from "node:assert/strict";
import { runCommand, cleanup } from "./helpers.js";

test("pjs features build и запуск", () => {
  const outDir = "test_build_pjs_features";
  cleanup(outDir);

  runCommand(`node bin/pythonscript build test/pjs/test_features.pjs -o ${outDir}/out.js`);
  const output = runCommand(`node ${outDir}/out.js`);

  console.log("Вывод pjs features:\n", output.trim());

  assert.match(output, /slice1 .*2, 3/, "slice1 должен содержать 2 и 3");
  assert.match(output, /slice2 .*1, 2/, "slice2 должен содержать 1 и 2");
  assert.match(output, /slice3 .*4, 5/, "slice3 должен содержать 4 и 5");
  assert.match(output, /x 3/, "должно быть x 3");
  assert.match(output, /flag true/, "должно быть flag true");
  assert.match(output, /val 5/, "должно быть val 5");
  assert.match(output, /none null/, "None должно маппиться в null");

  cleanup(outDir);
});
