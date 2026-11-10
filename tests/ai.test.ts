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
  hintLevel: 0,
};

test("optional Gemini endpoint validates requests, keeps secrets server-side, and limits usage", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;
  async function call(
    body: unknown = valid,
    options: {
      path?: string;
      method?: string;
      origin?: string;
      raw?: string;
    } = {},
  ) {
    const payload = options.raw ?? JSON.stringify(body);
    const req = Object.assign(Readable.from([Buffer.from(payload)]), {
      url: options.path ?? "/api/hint",
      method: options.method ?? "POST",
      headers: {
        host: "127.0.0.1:3001",
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(payload)),
        ...(options.origin ? { origin: options.origin } : {}),
      },
      socket: { remoteAddress: "127.0.0.1" },
    }) as unknown as IncomingMessage;
    let status = 200;
    let text = "";
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
        text += value;
      },
    } as unknown as ServerResponse;
    const handled = await handleAi(req, res);
    return {
      status: handled ? status : 404,
      body: (text ? JSON.parse(text) : {}) as Record<string, unknown>,
      retry: headers["retry-after"],
    };
  }
  try {
    await t.test(
      "is optional and does not contact Google when unconfigured",
      async () => {
        delete process.env.GEMINI_API_KEY;
        globalThis.fetch = async () => {
          throw new Error("must not call Google");
        };
        assert.equal((await call()).status, 503);
        assert.equal((await call(valid, { path: "/api/other" })).status, 404);
        assert.equal((await call(valid, { method: "GET" })).status, 405);
      },
    );
    process.env.GEMINI_API_KEY = "test-server-secret";
    delete process.env.GEMINI_MODEL;
    await t.test("blocks requests from other origins", async () => {
      assert.equal(
        (await call(valid, { origin: "https://unrelated.example" })).status,
        403,
      );
    });
    await t.test(
      "uses a known problem and never sends the answer to Google",
      async () => {
        let captured = "";
        globalThis.fetch = async (url, init) => {
          assert.match(String(url), /gemini-2\.5-flash:generateContent$/);
          assert.equal(
            (init?.headers as Record<string, string>)["x-goog-api-key"],
            "test-server-secret",
          );
          captured = String(init?.body);
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: "引用符の中の言葉に\u3001注目してみよう。" }],
                  },
                },
              ],
            }),
          );
        };
        const result = await call();
        assert.equal(result.status, 200);
        assert.equal(result.body.text, "引用符の中の言葉に注目してみよう。");
        assert.ok(captured.includes("読点は使わず"));
        assert.ok(captured.includes(problem.objective));
        assert.ok(!captured.includes(JSON.stringify(problem.solution)));
        assert.ok(!JSON.stringify(result.body).includes("test-server-secret"));
      },
    );
    await t.test(
      "rejects wrong-course IDs, malformed payloads, and oversized code",
      async () => {
        assert.equal(
          (await call({ ...valid, language: "python" })).status,
          400,
        );
        assert.equal((await call({ ...valid, hintLevel: -1 })).status, 400);
        assert.equal((await call(valid, { raw: "{broken" })).status, 400);
        assert.equal(
          (await call({ ...valid, code: "x".repeat(20_000) })).status,
          413,
        );
      },
    );
    await t.test(
      "sanitizes upstream failures and empty responses",
      async () => {
        globalThis.fetch = async () =>
          new Response("secret-provider-error", { status: 500 });
        const failed = await call();
        assert.equal(failed.status, 502);
        assert.ok(
          !JSON.stringify(failed.body).includes("secret-provider-error"),
        );
        globalThis.fetch = async () =>
          new Response(JSON.stringify({ candidates: [] }));
        assert.equal((await call()).status, 502);
        globalThis.fetch = async () => {
          throw new Error("secret network details");
        };
        assert.equal((await call()).status, 502);
      },
    );
    await t.test(
      "caps generated text and throttles repeated requests",
      async () => {
        globalThis.fetch = async () =>
          new Response(
            JSON.stringify({
              candidates: [
                { content: { parts: [{ text: "a".repeat(5000) }] } },
              ],
            }),
          );
        const limited = await call();
        assert.equal(limited.status, 200);
        assert.equal(String(limited.body.text).length, 3000);
        let last = limited;
        for (let i = 0; i < 13; i++) last = await call();
        assert.equal(last.status, 429);
        assert.equal(last.retry, "60");
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
  }
});
