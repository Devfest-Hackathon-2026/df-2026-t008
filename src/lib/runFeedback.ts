import type { Language, RunResult } from "../types";
import { getRuntimeErrorGuide } from "./runtimeErrors";

export type FailureContext = {
  error?: string;
  tests: { index: number; actual?: string; error?: string }[];
};

function diagnostic(raw: string): string {
  const marker = "\n\n元のエラー：\n";
  const original = raw.includes(marker) ? raw.split(marker).at(-1)! : raw;
  // Python tracebacks put the exception and useful learner line near the end.
  return original.slice(-1500);
}

function describeActual(actual: unknown): string {
  try {
    return (JSON.stringify(actual) ?? "値が返されていません").slice(0, 500);
  } catch {
    return "結果を表示できませんでした";
  }
}

/** Only failed evidence is sent. Expected values and inputs come from the server. */
export function buildFailureContext(result: RunResult): FailureContext {
  return {
    ...(result.error ? { error: diagnostic(result.error) } : {}),
    tests: result.tests
      .map((test, index) => ({ test, index }))
      .filter(({ test }) => !test.passed)
      .slice(0, 3)
      .map(({ test, index }) => ({
        index,
        ...(test.error
          ? { error: diagnostic(test.error) }
          : { actual: describeActual(test.actual) }),
      })),
  };
}

/** Available immediately, even offline or while Gemini is preparing an explanation. */
export function getRunFeedback(result: RunResult, language?: Language): string {
  if (result.passed) return "";
  const error = result.error || result.tests.find((test) => test.error)?.error;
  if (error) {
    const guide = getRuntimeErrorGuide(error);
    if (guide) return guide;
    if (/読み込|起動でき|Pythonの読み込み/.test(error))
      return "コードの確認を始められませんでした。ネット接続を確認してからもう一度実行してみよう。";
    if (/実行時間|繰り返しが終わる/.test(error))
      return "処理が終わるまでに時間がかかっています。繰り返しを止める条件があるか確認してみよう。";
    if (/実行を中止/.test(error))
      return "実行を中止しました。準備ができたらもう一度試せます。";
    if (/コードが長すぎ/.test(error))
      return "コードが長くなりすぎています。この問題に必要な関数を残してからもう一度試してみよう。";
    if (/関数.*見つかりません/.test(error))
      return "問題で指定された関数が見つかりません。関数の名前とつづりを確認してみよう。";
    return "途中で処理が止まったようです。問題で指定された関数と使っている値を見直してみよう。ヒントからも考え方を確認できます。";
  }
  const missing = result.tests.some(
    (test) => !test.passed && (test.actual === undefined || test.actual === "undefined"),
  );
  if (missing)
    return `関数から結果が返っていないようです。${language === "python" ? "字下げと" : ""}returnで返す値を確認してみよう。`;
  return "動かすことはできましたが期待する結果と少し違うようです。失敗したテストの「期待する結果」と「実際の結果」を比べて返す値や条件を見直してみよう。";
}
