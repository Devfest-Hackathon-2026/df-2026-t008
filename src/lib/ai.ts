import type { Language } from "../types";

/** Sends the current code only after the player explicitly asks NAVI for AI help. */
export async function requestAiHint(
  language: Language,
  problemId: string,
  code: string,
  hintLevel: number,
): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(
      `${String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "")}/api/hint`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ language, problemId, code, hintLevel }),
      },
    );
    const result = (await response.json()) as { text?: string; error?: string };
    if (!response.ok || !result.text)
      throw new Error(result.error || "AIのヒントを取得できませんでした。");
    return result.text;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        "AIの応答を待ちきれませんでした。通常の段階ヒントを使ってください。",
      );
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
