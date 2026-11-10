import type { Language, RunResult } from "../types";
import { buildFailureContext } from "./runFeedback";

async function requestAi(
  endpoint: "hint" | "feedback",
  payload: unknown,
  signal?: AbortSignal,
): Promise<string> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 20_000);
  try {
    const response = await fetch(
      `${String(import.meta.env?.VITE_API_URL || "").replace(/\/$/, "")}/api/${endpoint}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(payload),
      },
    );
    const result: unknown = await response.json();
    const body = result && typeof result === "object"
      ? result as { text?: unknown; error?: unknown }
      : {};
    if (!response.ok || typeof body.text !== "string" || !body.text.trim())
      throw new Error(
        typeof body.error === "string"
          ? body.error
          : "AIの説明を取得できませんでした。通常のヒントを使ってください。",
      );
    return body.text.trim().slice(0, 3000);
  } catch (error) {
    if (timedOut)
      throw new Error(
        "AIの応答を待ちきれませんでした。通常の段階ヒントを使ってください。",
      );
    if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

/** Sends the current code after the player explicitly asks NAVI for AI help. */
export function requestAiHint(
  language: Language,
  problemId: string,
  code: string,
  hintLevel: number,
): Promise<string> {
  return requestAi("hint", { language, problemId, code, hintLevel });
}

/** Called for a failed run only when Gemini feedback is enabled. */
export function requestAiFeedback(
  language: Language,
  problemId: string,
  code: string,
  result: RunResult,
  signal?: AbortSignal,
): Promise<string> {
  if (result.passed)
    return Promise.reject(new Error("成功した実行にはエラーの説明は不要です。"));
  return requestAi(
    "feedback",
    { language, problemId, code, failure: buildFailureContext(result) },
    signal,
  );
}
