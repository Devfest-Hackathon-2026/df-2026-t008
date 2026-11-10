import { test } from "node:test";
import assert from "node:assert/strict";
import { explainRuntimeError } from "../src/lib/runtimeErrors";
test("interpreter errors keep raw evidence while adding actionable beginner guidance", () => {
  for (const [raw, guide] of [
    ["SyntaxError: Unexpected token }", "かっこ"],
    ["IndentationError: expected an indented block", "字下げ"],
    ["NameError: name 'power' is not defined", "つづり"],
    ["TypeError: unsupported operand type(s)", "データの種類"],
    ["IndexError: list index out of range", "長さ − 1"],
    ["ZeroDivisionError: division by zero", "0で割ろう"],
    ["ModuleNotFoundError: No module named 'numpy'", "追加ライブラリ"],
  ]) {
    const result = explainRuntimeError(raw);
    assert.ok(result.includes(raw));
    assert.ok(result.includes(guide));
  }
});
test("unknown runtime messages and existing Japanese guidance remain intact", () => {
  assert.equal(
    explainRuntimeError("関数が見つかりません。"),
    "関数が見つかりません。",
  );
  assert.equal(explainRuntimeError("Unknown exception"), "Unknown exception");
  assert.ok(explainRuntimeError("Error: " + "a".repeat(5000)).length < 4100);
});
