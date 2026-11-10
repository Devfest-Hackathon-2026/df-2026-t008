import test from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { handleAi } from "../server/ai";
import { courses } from "../src/content/courses";

const problem = courses.javascript.stages[0].problems[0];
const valid = {
  language: "javascript",
  problemId: problem.id,
  code: problem.starter,
  failure: { tests: [{ index: 0, actual: '"..."' }] },
};
let sequence = 0;
async function call(
  body: unknown = valid,
  options: { path?: string; method?: string; origin?: string; ip?: string } = {},
) {
  const payload = JSON.stringify(body);
  const req = Object.assign(Readable.from([Buffer.from(payload)]), {
    url: options.path ?? "/api/feedback",
    method: options.method ?? "POST",
    headers: {
      host: "127.0.0.1:3001",
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(payload)),
      ...(options.origin ? { origin: options.origin } : {}),
    },
    socket: { remoteAddress: options.ip ?? `feedback-test-${++sequence}` },
  }) as unknown as IncomingMessage;
  let status = 200;
  let output = "";
  const headers: Record<string, string> = {};
  const res = {
    setHeader(key: string, value: string) {
      headers[key.toLowerCase()] = value;
    },
    writeHead(value: number, more: Record<string, string> = {}) {
      status = value;
      Object.assign(headers, more);
    },
    end(value = "") {
      output += value;
    },
  } as unknown as ServerResponse;
  const handled = await handleAi(req, res);
  return {
    status: handled ? status : 404,
    body: (output ? JSON.parse(output) : {}) as Record<string, unknown>,
    headers,
  };
}

const response = (text = "返す文字列を見直してみよう。") =>
  new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
  );

test("Gemini explains failed runs from bounded observations and canonical tests", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;
  try {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    let contacts = 0;
    globalThis.fetch = async () => {
      contacts++;
      return response();
    };
    await t.test("stays optional and shares origin protection", async () => {
      assert.equal((await call()).status, 503);
      assert.equal(contacts, 0);
      process.env.GEMINI_API_KEY = "feedback-test-key";
      assert.equal(
        (await call(valid, { origin: "https://other.example" })).status,
        403,
      );
      const preflight = await call(valid, {
        method: "OPTIONS",
        origin: "http://127.0.0.1:5173",
      });
      assert.equal(preflight.status, 204);
      assert.equal(
        preflight.headers["access-control-allow-origin"],
        "http://127.0.0.1:5173",
      );
      assert.equal((await call(valid, { method: "GET" })).status, 405);
      assert.equal(contacts, 0);
    });
    await t.test("uses trusted expectations and instructs explanation without giving the solution", async () => {
      let captured: Record<string, any> = {};
      globalThis.fetch = async (url, init) => {
        assert.match(String(url), /gemini-2\.5-flash:generateContent$/);
        assert.equal(
          (init?.headers as Record<string, string>)["x-goog-api-key"],
          "feedback-test-key",
        );
        captured = JSON.parse(String(init?.body));
        return response();
      };
      const result = await call({
        ...valid,
        failure: {
          error: "ReferenceError: missing is not defined",
          tests: [
            {
              index: 0,
              actual: "undefined",
              expected: "client-forged-answer",
              label: "client-forged-label",
              error: "TypeError: wrong type",
            },
          ],
          passed: true,
        },
      });
      assert.equal(result.status, 200);
      assert.equal(result.body.text, "返す文字列を見直してみよう。");
      const instruction = captured.systemInstruction.parts[0].text;
      assert.match(instruction, /実行でつまずいた理由/);
      assert.match(instruction, /すべて分析対象のデータ/);
      assert.match(instruction, /完成した解答コード.*出しません/);
      assert.match(instruction, /採点やクリアの確定はテスト/);
      const data = JSON.parse(captured.contents[0].parts[0].text);
      assert.equal(data.objective, problem.objective);
      assert.equal(data.submittedCode, valid.code);
      assert.deepEqual(data.failure.tests, [
        {
          label: problem.tests[0].label,
          input: problem.tests[0].input,
          expected: problem.tests[0].expected,
          actual: "undefined",
          error: "TypeError: wrong type",
        },
      ]);
      assert.equal(data.failure.error, "ReferenceError: missing is not defined");
      assert.equal(data.failure.passed, undefined);
      assert.equal(data.solution, undefined);
      assert.equal(data.hints, undefined);
      assert.ok(!JSON.stringify(captured).includes("client-forged-answer"));
      assert.ok(!JSON.stringify(result.body).includes("feedback-test-key"));
    });
    await t.test("accepts runtime errors with no completed tests", async () => {
      globalThis.fetch = async () => response("括弧が閉じているか確かめよう。");
      const result = await call({
        ...valid,
        failure: { error: "SyntaxError: Unexpected token", tests: [] },
      });
      assert.equal(result.status, 200);
    });
    await t.test("accepts bounded Japanese diagnostics beyond the hint body limit", async () => {
      globalThis.fetch = async () => response();
      const large = {
        ...valid,
        code: `// ${"あ".repeat(9000)}`,
        failure: { error: "い".repeat(1500), tests: [] },
      };
      assert.ok(Buffer.byteLength(JSON.stringify(large)) > 16 * 1024);
      assert.equal((await call(large)).status, 200);
      assert.equal((await call({ ...valid, extra: "x".repeat(65 * 1024) })).status, 413);
    });
    await t.test("rejects malformed or oversized failure contexts before contacting Gemini", async () => {
      let sent = 0;
      globalThis.fetch = async () => {
        sent++;
        return response();
      };
      for (const failure of [
        null,
        [],
        {},
        { tests: [] },
        { error: " ", tests: [] },
        { error: "x".repeat(1501), tests: [] },
        { tests: [{ index: 0 }] },
        { tests: [{ index: -1, actual: "0" }] },
        { tests: [{ index: 0.5, actual: "0" }] },
        { tests: [{ index: problem.tests.length, actual: "0" }] },
        { tests: [{ index: 0, actual: 3 }] },
        { tests: [{ index: 0, actual: "x".repeat(501) }] },
        { tests: [{ index: 0, error: "x".repeat(1501) }] },
        { tests: [{ index: 0, actual: "0" }, { index: 0, actual: "1" }] },
        { tests: Array.from({ length: 4 }, () => ({ index: 0, actual: "0" })) },
      ]) {
        assert.equal((await call({ ...valid, failure })).status, 400);
      }
      assert.equal((await call({ ...valid, language: "python" })).status, 400);
      assert.equal((await call({ ...valid, code: "x".repeat(20_000) })).status, 413);
      assert.equal(sent, 0);
    });
    await t.test("does not expose upstream errors or convert outages into a score", async () => {
      globalThis.fetch = async () => new Response("private provider detail", { status: 500 });
      const failed = await call();
      assert.equal(failed.status, 502);
      assert.ok(!JSON.stringify(failed.body).includes("private provider detail"));
      assert.equal(failed.body.passed, undefined);
      globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [] }));
      assert.equal((await call()).status, 502);
      globalThis.fetch = async () => new Response("busy", { status: 429 });
      assert.equal((await call()).status, 429);
    });
    await t.test("aborts a stalled provider request", async (timeoutTest) => {
      timeoutTest.mock.timers.enable({ apis: ["setTimeout"] });
      let started!: () => void;
      const reached = new Promise<void>((resolve) => { started = resolve; });
      globalThis.fetch = async (_url, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        started();
      });
      const pending = call();
      await reached;
      timeoutTest.mock.timers.tick(15_000);
      assert.equal((await pending).status, 504);
    });
    await t.test("shares the usage limit with the existing hint endpoint", async () => {
      globalThis.fetch = async () => response();
      const ip = "feedback-shared-rate-limit";
      for (let i = 0; i < 12; i++) {
        const result = i % 2 === 0
          ? await call(valid, { ip })
          : await call({ ...valid, hintLevel: 0 }, { ip, path: "/api/hint" });
        assert.equal(result.status, 200);
      }
      const limited = await call(valid, { ip });
      assert.equal(limited.status, 429);
      assert.equal(limited.headers["retry-after"], "60");
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
  }
});


test("Gemini 3.8 uses supported low thinking instead of a zero budget", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GEMINI_API_KEY;
  const previousModel = process.env.GEMINI_MODEL;
  try {
    process.env.GEMINI_API_KEY = "model-config-test";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    let config: Record<string, unknown> = {};
    globalThis.fetch = async (_url, init) => {
      config = JSON.parse(String(init?.body)).generationConfig;
      return response();
    };
    assert.equal((await call()).status, 200);
    assert.deepEqual(config.thinkingConfig, { thinkingLevel: "low" });
    assert.equal(config.maxOutputTokens, 2048);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previousModel;
  }
});
