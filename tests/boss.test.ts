import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { courses } from "../src/content/courses";
import { buildBossProblem } from "../src/lib/boss";
import type { Language } from "../src/types";

function solutions(language: Language) {
  return Object.fromEntries(
    courses[language].stages
      .find((stage) => stage.kind === "boss")!
      .problems.map((p) => [p.id, p.solution]),
  );
}
function jsResults(code: string, functionName: string, inputs: unknown[][]) {
  return inputs.map((input) =>
    JSON.parse(
      vm.runInNewContext(
        `${code}\nJSON.stringify(${functionName}(...${JSON.stringify(input)}))`,
        {},
        { timeout: 500 },
      ),
    ),
  );
}
function pythonResults(
  code: string,
  functionName: string,
  inputs: unknown[][],
) {
  // Only trusted repository-authored examples are executed on this test host.
  const script =
    'import json,sys\np=json.load(sys.stdin)\nscope={}\nexec(p["code"],scope)\nprint(json.dumps([scope[p["functionName"]](*args) for args in p["inputs"]]))';
  const result = spawnSync("python3", ["-c", script], {
    input: JSON.stringify({ code, functionName, inputs }),
    encoding: "utf8",
    timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as unknown[];
}

for (const language of ["javascript", "python"] as const) {
  test(`${language}: final test composes all three player functions`, () => {
    const { problem, code } = buildBossProblem(language, solutions(language));
    const results =
      language === "javascript"
        ? jsResults(
            code,
            problem.functionName,
            problem.tests.map((t) => t.input),
          )
        : pythonResults(
            code,
            problem.functionName,
            problem.tests.map((t) => t.input),
          );
    assert.deepEqual(
      results,
      problem.tests.map((t) => t.expected),
    );
    assert.ok(problem.tests.length >= 5);
    // These boundary cases require authorization to use recovered distributed
    // energy, not the original request or a hard-coded success value.
    assert.equal((results[1] as { online: boolean }).online, true);
    assert.equal((results[2] as { online: boolean }).online, false);
  });

  test(`${language}: a broken upstream function affects downstream authorization`, () => {
    const drafts = solutions(language);
    const power = courses[language].stages
      .find((s) => s.kind === "boss")!
      .problems.find((p) => p.functionName === "distribute")!;
    // Mutating the upstream allocation changes the report consumed by authorization.
    // The selected independent circuit now produces36 instead of24.
    drafts[power.id] = power.solution.replace("* 2", "* 3");
    const { problem, code } = buildBossProblem(language, drafts);
    const inputs = [problem.tests[2].input];
    const [actual] =
      language === "javascript"
        ? jsResults(code, problem.functionName, inputs)
        : pythonResults(code, problem.functionName, inputs);
    assert.equal((actual as { report: { energy: number } }).report.energy, 36);
    assert.equal((actual as { online: boolean }).online, false);
    assert.notDeepEqual(actual, problem.tests[2].expected);
  });

  test(`${language}: missing player drafts never fall back to reference answers`, () => {
    const { code } = buildBossProblem(language, {});
    for (const p of courses[language].stages.find((s) => s.kind === "boss")!
      .problems) {
      assert.ok(code.includes(p.starter));
      assert.ok(!code.includes(p.solution));
    }
  });
}
