import test from "node:test";
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { courses } from "../src/content/courses";
import { CAMPAIGN_LAYERS, layerForStage } from "../src/lib/campaign";
import type { Problem } from "../src/types";

function assertJsonValue(value: unknown, label: string): void {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return;
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${label}: finite numbers only`);
    return;
  }
  assert.ok(typeof value === "object", `${label}: JSON values only`);
  assert.ok(
    Array.isArray(value) ||
      Object.prototype.toString.call(value) === "[object Object]",
    `${label}: ordinary arrays and objects only`,
  );
  for (const [key, child] of Object.entries(value as object))
    assertJsonValue(child, `${label}.${key}`);
}

function javascriptResult(
  problem: Problem,
  code: string,
  input: unknown[],
): unknown {
  const actual = vm.runInNewContext(
    `${code}\n${problem.functionName}(...${JSON.stringify(input)})`,
    {},
    { timeout: 400 },
  );
  assertJsonValue(actual, problem.id);
  // Normalize the same JSON data that crosses the browser worker boundary.
  return JSON.parse(JSON.stringify(actual));
}

for (const course of Object.values(courses)) {
  test(`${course.label}: 54 independent stages fill every difficulty layer`, () => {
    assert.equal(course.stages.length, 54);
    assert.deepEqual(
      CAMPAIGN_LAYERS.map((layer) => layer.count),
      [20, 16, 12, 6],
    );
    assert.deepEqual(
      CAMPAIGN_LAYERS.map(
        (_, layer) =>
          course.stages.filter((_, index) => layerForStage(index) === layer)
            .length,
      ),
      [20, 16, 12, 6],
    );
    assert.equal(
      course.stages.filter((stage) => stage.kind === "boss").length,
      1,
    );
    assert.equal(course.stages[53].kind, "boss");
    assert.equal(course.stages.flatMap((stage) => stage.problems).length, 56);
    const stageIds = new Set<string>();
    const problemIds = new Set<string>();
    const functionNames = new Set<string>();
    for (const [index, stage] of course.stages.entries()) {
      assert.ok(stage.id.startsWith(course.language));
      assert.ok(!stageIds.has(stage.id), `duplicate stage ${stage.id}`);
      stageIds.add(stage.id);
      assert.ok(
        stage.title.length > 0 &&
          stage.subtitle.length > 0 &&
          stage.location.length > 0,
      );
      assert.ok(stage.intro.length > 10 && stage.outro.length > 10);
      assert.equal(stage.problems.length, index === 53 ? 3 : 1);
      for (const problem of stage.problems) {
        assert.ok(problem.id.startsWith(course.language));
        assert.ok(
          problem.id.length <= 128,
          `${problem.id}: fits saved progress keys`,
        );
        assert.ok(
          !problemIds.has(problem.id),
          `duplicate problem ${problem.id}`,
        );
        assert.ok(
          !functionNames.has(problem.functionName),
          `duplicate function ${problem.functionName}`,
        );
        assert.match(problem.functionName, /^[A-Za-z_]\w*$/);
        problemIds.add(problem.id);
        functionNames.add(problem.functionName);
        assert.ok(problem.starter.includes(problem.functionName));
        assert.ok(problem.solution.includes(problem.functionName));
        assert.ok(
          problem.briefing.length > 10 && problem.objective.length > 10,
        );
        assert.equal(problem.hints.length, 3);
        assert.ok(problem.hints.every((hint) => hint.length > 4));
        assert.ok(problem.explanation.length > 20);
        assert.ok(problem.tests.length >= (index === 0 ? 1 : 2));
        for (const testcase of problem.tests) {
          assert.ok(Array.isArray(testcase.input));
          assert.ok(testcase.label.length > 0);
          assertJsonValue(testcase.input, `${problem.id}: input`);
          assertJsonValue(testcase.expected, `${problem.id}: expected`);
        }
      }
    }
    assert.deepEqual(
      course.stages[53].problems.map((problem) => problem.functionName).sort(),
      ["authorize", "distribute", "recover"],
    );
    // Each ring introduces different skills rather than parameter-only copies.
    for (const layer of CAMPAIGN_LAYERS) {
      const concepts = new Set(
        course.stages
          .slice(layer.start, layer.end)
          .flatMap((stage) => stage.problems.map((problem) => problem.concept)),
      );
      assert.ok(
        concepts.size >= 4,
        `${layer.name}: distinct programming concepts`,
      );
    }
  });
}

test("both languages teach the same contracts and test inputs at each stage", () => {
  const javascript = courses.javascript.stages;
  const python = courses.python.stages;
  assert.equal(javascript.length, python.length);
  for (let index = 0; index < javascript.length; index++) {
    assert.equal(javascript[index].kind, python[index].kind);
    assert.equal(
      javascript[index].problems.length,
      python[index].problems.length,
    );
    for (
      let problemIndex = 0;
      problemIndex < javascript[index].problems.length;
      problemIndex++
    ) {
      const js = javascript[index].problems[problemIndex];
      const py = python[index].problems[problemIndex];
      assert.equal(
        js.id.replace(/^javascript-/, ""),
        py.id.replace(/^python-/, ""),
      );
      assert.equal(js.functionName, py.functionName);
      assert.equal(js.concept, py.concept);
      assert.deepEqual(
        js.tests,
        py.tests,
        `stage ${index + 1}: localized tests match`,
      );
    }
  }
});

test("all 56 JavaScript references pass and every starter needs a repair", () => {
  for (const stage of courses.javascript.stages) {
    for (const problem of stage.problems) {
      let failedStarter = false;
      for (const testcase of problem.tests) {
        assert.deepEqual(
          javascriptResult(problem, problem.solution, testcase.input),
          testcase.expected,
          `${problem.id}: ${testcase.label}`,
        );
        try {
          failedStarter ||= !isDeepStrictEqual(
            javascriptResult(problem, problem.starter, testcase.input),
            testcase.expected,
          );
        } catch {
          // Unfinished starters may raise or fail to compile. References must run.
          failedStarter = true;
        }
      }
      assert.ok(
        failedStarter,
        `${problem.id}: starter should require a change`,
      );
    }
  }
});

function pythonResults(problems: Problem[], useStarters = true) {
  // Trusted repository examples only. Learner code runs in the browser worker.
  const script = `import copy, json, sys
payload = json.load(sys.stdin)
results = []
for problem in payload['problems']:
    reference = {}
    try:
        exec(problem['solution'], reference)
    except Exception as error:
        raise RuntimeError(problem['id'] + ': reference could not load') from error
    initial = {}
    starter_error = None
    if payload['starters']:
        try:
            exec(problem['starter'], initial)
        except Exception as error:
            starter_error = type(error).__name__
    cases = []
    for testcase in problem['tests']:
        try:
            actual = reference[problem['functionName']](*copy.deepcopy(testcase['input']))
            json.dumps(actual, allow_nan=False)
        except Exception as error:
            raise RuntimeError(problem['id'] + ': ' + testcase['label']) from error
        starter = {'error': starter_error} if starter_error else {}
        if payload['starters'] and not starter_error:
            try:
                starter['value'] = initial[problem['functionName']](*copy.deepcopy(testcase['input']))
                json.dumps(starter['value'], allow_nan=False)
            except Exception as error:
                starter = {'error': type(error).__name__}
        cases.append({'actual': actual, 'starter': starter})
    results.append(cases)
print(json.dumps(results, allow_nan=False))
`;
  const result = spawnSync("python3", ["-c", script], {
    input: JSON.stringify({ problems, starters: useStarters }),
    encoding: "utf8",
    timeout: 12_000,
    maxBuffer: 1024 * 1024,
  });
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as {
    actual: unknown;
    starter: { error?: string; value?: unknown };
  }[][];
}

test("all 56 Python references match JavaScript and their starters need repairs", () => {
  const problems = courses.python.stages.flatMap((stage) => stage.problems);
  const javascript = courses.javascript.stages.flatMap(
    (stage) => stage.problems,
  );
  const outputs = pythonResults(problems);
  assert.equal(outputs.length, problems.length);
  for (const [index, problem] of problems.entries()) {
    let failedStarter = false;
    for (const [testIndex, testcase] of problem.tests.entries()) {
      const output = outputs[index][testIndex];
      assert.deepEqual(
        output.actual,
        testcase.expected,
        `${problem.id}: ${testcase.label}`,
      );
      const js = javascript[index];
      assert.deepEqual(
        output.actual,
        javascriptResult(js, js.solution, testcase.input),
        `${problem.id}: JS/Python parity`,
      );
      failedStarter ||=
        !!output.starter.error ||
        !isDeepStrictEqual(output.starter.value, testcase.expected);
    }
    assert.ok(failedStarter, `${problem.id}: starter should require a change`);
  }
});
