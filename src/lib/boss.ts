import { courses } from "../content/courses";
import type { Language, Problem } from "../types";

/**
 * Final end-to-end scenario: server requests become allocated power, allocated
 * power becomes recovered energy, and that energy authorizes the world network.
 * The three player-authored functions genuinely feed each other here.
 */
export function buildBossProblem(
  language: Language,
  drafts: Record<string, string>,
): { problem: Problem; code: string } {
  const boss = courses[language].stages.find((stage) => stage.kind === "boss");
  if (!boss) throw new Error("最終ステージが見つかりません。");
  const implementations = boss.problems.map(
    (problem) => drafts[problem.id] ?? problem.starter,
  );
  const harness =
    language === "javascript"
      ? `function knotRestoreWorld(requests, trusted) {
  const allocation = distribute(requests);
  const energy = recover(allocation);
  const online = authorize(energy, trusted);
  return { allocation, energy, online };
}`
      : `def knotRestoreWorld(requests, trusted):
    allocation = distribute(requests)
    energy = recover(allocation)
    online = authorize(energy, trusted)
    return {"allocation": allocation, "energy": energy, "online": online}
`;
  const problem: Problem = {
    id: `${language}-world-integration`,
    title: "世界接続テスト",
    concept: "認証・電力・通信の統合",
    briefing:
      "書き上げた3つの処理をつなぎます。各サーバーの要求を電力へ変換し有効な電力を合計しその合計値と接続の信頼性で世界ネットワークへの接続を判定します。",
    objective:
      "distribute → recover → authorize の順につないだシステムが正常時・電力不足・ノイズ混入・未認証のすべてで正しく動くことを確認します。",
    functionName: "knotRestoreWorld",
    starter: "",
    solution: "",
    tests: [
      {
        label: "3つの機能を接続して世界を復旧",
        input: [[10, 15, 5], true],
        expected: { allocation: [20, 30, 10], energy: 60, online: true },
      },
      {
        label: "配分後の電力がちょうど50で接続",
        input: [[25], true],
        expected: { allocation: [50], energy: 50, online: true },
      },
      {
        label: "配分と集計が正しくても電力不足なら待機",
        input: [[12, 12], true],
        expected: { allocation: [24, 24], energy: 48, online: false },
      },
      {
        label: "ノイズのある要求を除いて接続",
        input: [[-50, 25, 0], true],
        expected: { allocation: [0, 50, 0], energy: 50, online: true },
      },
      {
        label: "電力が十分でも未認証の接続を拒否",
        input: [[40, 10], false],
        expected: { allocation: [80, 20], energy: 100, online: false },
      },
      {
        label: "サーバー要求が届かないときは待機",
        input: [[], true],
        expected: { allocation: [], energy: 0, online: false },
      },
    ],
    hints: [
      "3つの処理は電力配分→通信量の集計→認証の順につながっています。失敗したテストの出力を確認しましょう。",
      "allocation が違うなら distributeenergy が違うなら recoveronline だけ違うなら authorize を見直しましょう。",
      "0以下の要求は0に正の要求は2倍にします。その合計が50以上かつ信頼済みなら接続できます。",
    ],
    explanation:
      "別々に実装した関数がひとつのシステムとして動きました。配分の結果が集計の入力になりその集計が認証を左右します。部品ごとのテストに加えて組み合わせた振る舞いを確かめることを統合テストと呼びます。",
  };
  return { problem, code: `${implementations.join("\n\n")}\n\n${harness}` };
}
