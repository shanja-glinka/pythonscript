import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { runCommand, cleanup } from "./helpers.js";

test("lint проходит на корректном файле", () => {
  const lintOutput = runCommand("node bin/pythonscript lint test/pjs/test_scalars.pjs");
  assert.match(lintOutput, /Lint OK/, "должно сообщать об успехе");
  console.log(lintOutput.trim());
});

test("lint падает на некорректном файле", () => {
  const badDir = path.join(process.cwd(), "test_build_lint");
  cleanup("test_build_lint");
  fs.mkdirSync(badDir, { recursive: true });
  const badFile = path.join(badDir, "bad.pjs");
  fs.writeFileSync(badFile, "def foo()\n    pass\n", "utf8");

  let errorMessage = "";
  try {
    runCommand(`node bin/pythonscript lint ${badFile}`);
  } catch (e) {
    errorMessage = e.message || String(e);
  }
  assert.ok(errorMessage.includes("Lint failed"), "lint должен падать на синтаксической ошибке");
  console.log("lint fail-case:", errorMessage.trim().split("\n").slice(0, 2).join("\n"));
  cleanup("test_build_lint");
});
