import test from "node:test";
import assert from "node:assert/strict";
import { runCommand } from "./helpers.js";

test("tokenize выводит JSON с токенами", () => {
  const tokensJson = runCommand("node bin/pythonscript tokenize test/pjs/test_scalars.pjs");
  const tokens = JSON.parse(tokensJson);
  assert.ok(Array.isArray(tokens), "tokenize должен вернуть массив");
  assert.ok(tokens.length > 0, "tokenize должен вернуть >0 токенов");
  console.log(`tokenize: получено токенов = ${tokens.length}`);
});

test("ast выводит JSON с AST", () => {
  const astJson = runCommand("node bin/pythonscript ast test/pjs/test_scalars.pjs");
  const ast = JSON.parse(astJson);
  assert.equal(ast.type, "Module", "корневой тип должен быть Module");
  console.log(`ast: корневой тип = ${ast.type}`);
});
