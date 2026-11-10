import test from "node:test";
import assert from "node:assert/strict";
import { requestAiFeedback, requestAiHint } from "../src/lib/ai";
import type { RunResult } from "../src/types";

const failed: RunResult = {
  passed: false,
  duration: 1,
  error: "SyntaxError: Unexpected token",
  tests: [],
};
const abortableFetch: typeof fetch = async (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });

test("AI feedback client handles evidence, cancellation, timeout, and the existing hint API", async (t) => {
  const originalFetch = globalThis.fetch;
  try {
    await t.test("posts only failure evidence and reads plain explanation text", async () => {
      globalThis.fetch = async (url, init) => {
        assert.equal(url, "/api/feedback");
        assert.equal(init?.method, "POST");
        const body = JSON.parse(String(init?.body));
        assert.deepEqual(body, {
          language: "javascript",
          problemId: "sample",
          code: "broken code",
          failure: { error: "SyntaxError: Unexpected token", tests: [] },
        });
        return new Response(JSON.stringify({ text: "  引用符を見直してみよう。  " }));
      };
      assert.equal(await requestAiFeedback("javascript", "sample", "broken code", failed), "引用符を見直してみよう。");
    });
    await t.test("never sends a successful or already cancelled run", async () => {
      let called = false;
      globalThis.fetch = async () => { called = true; throw new Error("unexpected request"); };
      await assert.rejects(requestAiFeedback("javascript", "sample", "code", { ...failed, passed: true }));
      const controller = new AbortController();
      controller.abort();
      await assert.rejects(requestAiFeedback("javascript", "sample", "code", failed, controller.signal), { name: "AbortError" });
      assert.equal(called, false);
    });
    await t.test("aborts in-flight work when the editor invalidates a run", async () => {
      globalThis.fetch = abortableFetch;
      const controller = new AbortController();
      const request = requestAiFeedback("javascript", "sample", "code", failed, controller.signal);
      controller.abort();
      await assert.rejects(request, { name: "AbortError" });
    });
    await t.test("times out with actionable fallback text", async (context) => {
      context.mock.timers.enable({ apis: ["setTimeout"] });
      globalThis.fetch = abortableFetch;
      const request = requestAiFeedback("javascript", "sample", "code", failed);
      context.mock.timers.tick(20_000);
      await assert.rejects(request, /通常の段階ヒント/);
      context.mock.timers.reset();
    });
    await t.test("keeps the existing explicit hint contract", async () => {
      globalThis.fetch = async (url, init) => {
        assert.equal(url, "/api/hint");
        assert.deepEqual(JSON.parse(String(init?.body)), { language: "python", problemId: "sample", code: "def greet(): pass", hintLevel: 2 });
        return new Response(JSON.stringify({ text: "返す値を確認しよう。" }));
      };
      assert.equal(await requestAiHint("python", "sample", "def greet(): pass", 2), "返す値を確認しよう。");
    });
    await t.test("rejects API failures and empty or malformed explanations", async () => {
      globalThis.fetch = async () => new Response(JSON.stringify({ error: "AIはまだ接続されていません。" }), { status: 503 });
      await assert.rejects(requestAiFeedback("javascript", "sample", "code", failed), /まだ接続/);
      for (const body of [{ text: " " }, { text: 42 }, null]) {
        globalThis.fetch = async () => new Response(JSON.stringify(body));
        await assert.rejects(requestAiFeedback("javascript", "sample", "code", failed), /取得できません/);
      }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
