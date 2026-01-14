import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { runCommand, cleanup } from "./helpers.js";

test("js -> pjs build", () => {
  const outDir = "test_build_js_to_pjs";
  cleanup(outDir);

  runCommand(
    `node bin/pythonscript build test/js/test_scalars.js -o ${outDir}/test_scalars.out.pjs`
  );

  const outPath = path.join(outDir, "test_scalars.out.pjs");
  const generated = fs.readFileSync(outPath, "utf8");
  assert.ok(generated.length > 0, "должен быть сгенерирован файл .pjs");
  assert.ok(generated.trim().length > 0, "в выходе должен быть код на pjs");
  console.log(
    "Первые строки js->pjs:\n",
    generated
      .split("\n")
      .slice(0, 8)
      .join("\n")
  );

  cleanup(outDir);
});
