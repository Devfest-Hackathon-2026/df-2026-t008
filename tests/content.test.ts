import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { courses } from "../src/content/courses";

for (const course of Object.values(courses)) {
  test(`${course.label}: complete independent campaign and problem definitions`, () => {
    assert.equal(course.stages.length, 4);
    assert.deepEqual(
      course.stages.map((stage) => stage.kind),
      ["tutorial", "repair", "repair", "boss"],
    );
    const ids = new Set<string>();
    for (const stage of course.stages) {
      assert.ok(stage.id.startsWith(course.language));
      assert.ok(stage.intro.length > 30 && stage.outro.length > 30);
      assert.equal(stage.problems.length, 3);
      for (const problem of stage.problems) {
        assert.ok(!ids.has(problem.id), `duplicate ${problem.id}`);
        ids.add(problem.id);
        assert.ok(problem.id.startsWith(course.language));
        assert.ok(problem.starter.includes(problem.functionName));
        assert.ok(problem.solution.includes(problem.functionName));
        assert.equal(problem.hints.length, 3);
        assert.ok(problem.explanation.length > 20);
        assert.ok(problem.tests.length >= 1);
        assert.ok(
          problem.tests.every(
            (t) => Array.isArray(t.input) && typeof t.label === "string",
          ),
        );
      }
    }
  });
}

test("JavaScript reference solutions pass every test; each repair starts broken", () => {
  for (const stage of courses.javascript.stages) {
    for (const problem of stage.problems) {
      let failedStarter = false;
      for (const testcase of problem.tests) {
        const invocation = `${problem.functionName}(...${JSON.stringify(testcase.input)})`;
        const actual = vm.runInNewContext(
          `${problem.solution}\nJSON.stringify(${invocation})`,
          {},
          { timeout: 300 },
        );
        assert.equal(
          actual,
          JSON.stringify(testcase.expected),
          `${problem.id}: ${testcase.label}`,
        );
        const initial = vm.runInNewContext(
          `${problem.starter}\nJSON.stringify(${invocation})`,
          {},
          { timeout: 300 },
        );
        failedStarter ||= initial !== JSON.stringify(testcase.expected);
      }
      assert.ok(
        failedStarter,
        `${problem.id}: the initial code should need a change`,
      );
    }
  }
});

test("Python reference solutions pass every test; each repair starts broken", () => {
  // Trusted, repository-authored examples only. Player submissions never run in this process.
  const problems = courses.python.stages.flatMap((stage) => stage.problems);
  const script = `import json, sys\nproblems=json.load(sys.stdin)\nfor p in problems:\n    scope={}\n    exec(p['solution'], scope)\n    initial={}\n    exec(p['starter'], initial)\n    failed=False\n    for t in p['tests']:\n        actual=scope[p['functionName']](*t['input'])\n        assert actual==t['expected'], (p['id'], t['label'], actual)\n        failed=failed or initial[p['functionName']](*t['input'])!=t['expected']\n    assert failed, p['id']\nprint('all Python examples verified')\n`;
  const result = spawnSync("python3", ["-c", script], {
    input: JSON.stringify(problems),
    encoding: "utf8",
    timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr);
});
