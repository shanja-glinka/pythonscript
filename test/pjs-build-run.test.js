import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { runCommand, cleanup } from "./helpers.js";

test("pjs -> js build и запуск", () => {
  const outDir = "test_build_pjs_run";
  cleanup(outDir);

  runCommand(
    `node bin/pythonscript build test/pjs/test_scalars.pjs -o ${outDir}/test_scalars.out.js`
  );

  const output = runCommand(`node ${outDir}/test_scalars.out.js`);
  console.log("Вывод pjs->js:\n", output.trim().split("\n").slice(0, 10).join("\n"));
  assert.match(output, /13/, "должно выводиться 13");
  assert.match(output, /Done!/, "должно выводиться Done!");

  cleanup(outDir);
});
