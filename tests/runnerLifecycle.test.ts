import { test } from "node:test";
import assert from "node:assert/strict";
import { runCode, cancelRun } from "../src/lib/runner";
import type { Problem } from "../src/types";

const problem: Problem = {
  id: "test",
  title: "",
  concept: "",
  briefing: "",
  objective: "",
  functionName: "greet",
  starter: "",
  solution: "",
  tests: [{ label: "greeting", input: [], expected: "hello" }],
  hints: [],
  explanation: "",
};
test("canceling boot and active execution resolves pending runs without unlocking a newer run", async () => {
  const listeners = new Set<(event: any) => void>();
  const frames: any[] = [];
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  const windowMock = {
    setTimeout,
    addEventListener(_type: string, listener: any) {
      listeners.add(listener);
    },
    removeEventListener(_type: string, listener: any) {
      listeners.delete(listener);
    },
  };
  const documentMock = {
    createElement() {
      return {
        style: {},
        setAttribute() {},
        remove() {
          this.removed = true;
        },
        removed: false,
        contentWindow: {
          messages: [] as any[],
          postMessage(message: any) {
            this.messages.push(message);
          },
        },
      };
    },
    body: {
      append(frame: any) {
        frames.push(frame);
      },
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowMock,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentMock,
  });
  const emit = (frame: any, data: any) => {
    for (const listener of [...listeners])
      listener({ source: frame.contentWindow, data });
  };
  try {
    const loading = runCode(
      "javascript",
      problem,
      'function greet(){return "hello";}',
    );
    assert.equal(frames.length, 1);
    cancelRun();
    const current = runCode(
      "javascript",
      problem,
      'function greet(){return "hello";}',
    );
    assert.equal(frames.length, 2);
    assert.equal(frames[0].removed, true);
    emit(frames[1], { type: "ready" });
    await Promise.resolve();
    await Promise.resolve();
    assert.match((await loading).error ?? "", /中止/);
    assert.match(
      (await runCode("javascript", problem, "")).error ?? "",
      /実行中/,
    );
    const request = frames[1].contentWindow.messages[0];
    assert.ok(request);
    emit(frames[1], {
      type: "result",
      id: request.id,
      result: {
        passed: true,
        tests: [
          {
            label: "greeting",
            passed: true,
            actual: "hello",
            expected: "hello",
          },
        ],
        duration: 1,
      },
    });
    assert.equal((await current).passed, true);
    assert.equal(listeners.size, 0);

    const running = runCode("python", problem, 'def greet(): return "hello"');
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(frames[1].contentWindow.messages.length, 2);
    cancelRun();
    const replacement = runCode(
      "javascript",
      problem,
      'function greet(){return "hello";}',
    );
    emit(frames[2], { type: "ready" });
    await Promise.resolve();
    await Promise.resolve();
    assert.match((await running).error ?? "", /中止/);
    assert.match(
      (await runCode("javascript", problem, "")).error ?? "",
      /実行中/,
    );
    const nextRequest = frames[2].contentWindow.messages[0];
    // A stale response from the removed iframe cannot resolve a new execution.
    emit(frames[1], {
      type: "result",
      id: nextRequest.id,
      result: { passed: false, tests: [], duration: 1 },
    });
    emit(frames[2], {
      type: "result",
      id: nextRequest.id,
      result: { passed: true, tests: [], duration: 1 },
    });
    assert.equal((await replacement).passed, true);
    assert.equal(listeners.size, 0);
  } finally {
    cancelRun();
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else delete (globalThis as any).window;
    if (previousDocument)
      Object.defineProperty(globalThis, "document", previousDocument);
    else delete (globalThis as any).document;
  }
});
