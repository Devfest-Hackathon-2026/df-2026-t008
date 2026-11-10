import test from "node:test";
import assert from "node:assert/strict";
import type { RunResult } from "../src/types";
import { buildFailureContext, getRunFeedback } from "../src/lib/runFeedback";
import { explainRuntimeError } from "../src/lib/runtimeErrors";

const failed = (error: string): RunResult => ({
  passed: false,
  tests: [],
  error,
  duration: 1,
});

test("feedback sends bounded failed evidence with original test indexes and no answers", () => {
  const raw = "Traceback\n" + "x".repeat(3000) + "\nNameError: missing";
  const result: RunResult = {
    passed: false,
    error: explainRuntimeError(raw),
    duration: 1,
    tests: [
      { label: "pass", passed: true, expected: "SECRET_EXPECTED", actual: "ok" },
      { label: "fail", passed: false, expected: "SECRET_EXPECTED", actual: "a".repeat(1000) },
      { label: "error", passed: false, error: explainRuntimeError(raw) },
      { label: "pass", passed: true },
      { label: "missing return", passed: false },
      { label: "omitted", passed: false, actual: "FOURTH_FAILURE" },
    ],
  };
  const context = buildFailureContext(result);
  assert.deepEqual(context.tests.map((value) => value.index), [1, 2, 4]);
  assert.equal(context.error?.length, 1500);
  assert.ok(context.error?.endsWith("NameError: missing"));
  assert.equal(context.tests[0].actual?.length, 500);
  assert.ok(context.tests[1].error?.endsWith("NameError: missing"));
  assert.equal(context.tests[2].actual, "値が返されていません");
  const encoded = JSON.stringify(context);
  assert.ok(!encoded.includes("SECRET_EXPECTED"));
  assert.ok(!encoded.includes("FOURTH_FAILURE"));
  assert.ok(!encoded.includes("元のエラー"));
});

test("local feedback explains errors without showing raw traces", () => {
  const source = "SyntaxError: Unexpected token secret-source";
  const message = getRunFeedback(failed(explainRuntimeError(source)));
  assert.match(message, /かっこ/);
  assert.ok(!message.includes("SyntaxError"));
  assert.ok(!message.includes("secret-source"));
  const perTest = getRunFeedback({
    passed: false,
    duration: 1,
    tests: [{ label: "broken", passed: false, error: "TypeError: not callable" }],
  });
  assert.match(perTest, /データの種類/);
  assert.ok(!perTest.includes("TypeError"));
  assert.ok(!getRunFeedback(failed("Unknown exception secret-trace")).includes("secret-trace"));
});

test("local feedback separates missing return, value mismatch, and runtime setup failures", () => {
  const missing: RunResult = {
    passed: false,
    duration: 1,
    tests: [{ label: "missing", passed: false, actual: "undefined", expected: 3 }],
  };
  assert.match(getRunFeedback(missing, "python"), /字下げとreturn/);
  assert.match(getRunFeedback({ ...missing, tests: [{ label: "mismatch", passed: false, actual: 2, expected: 3 }] }), /期待する結果/);
  assert.match(getRunFeedback(failed("実行環境を起動できませんでした。")), /ネット接続/);
  assert.match(getRunFeedback(failed("実行時間が長くなっています。")), /止める条件/);
  assert.match(getRunFeedback(failed("コードが長すぎます。")), /必要な関数/);
  assert.equal(getRunFeedback({ passed: true, tests: [], duration: 1 }), "");
});
