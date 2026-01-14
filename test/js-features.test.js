import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { runCommand, cleanup } from "./helpers.js";

test("js features -> pjs build", () => {
  const outDir = "test_build_js_features";
  cleanup(outDir);

  runCommand(
    `node bin/pythonscript build test/js/test_features.js -o ${outDir}/test_features.out.pjs`
  );

  const outPath = path.join(outDir, "test_features.out.pjs");
  const generated = fs.readFileSync(outPath, "utf8");
  assert.ok(generated.length > 0, "должен быть сгенерирован файл .pjs");

  console.log(
    "Первые строки js-features->pjs:\n",
    generated
      .split("\n")
      .slice(0, 10)
      .join("\n")
  );

  cleanup(outDir);
});
