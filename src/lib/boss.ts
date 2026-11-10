import { courses } from "../content/courses";
import type { Language, Problem } from "../types";

/** The final allocation DP, strict increasing-chain analysis, and directed
 * graph authorization consume each other's actual learner-produced output. */
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
      ? `function knotRestoreWorld(requests, policy) {
  const allocation = distribute(requests);
  const report = recover(allocation);
  const online = authorize(report, policy);
  return { allocation, report, online };
}`
      : `def knotRestoreWorld(requests, policy):
    allocation = distribute(requests)
    report = recover(allocation)
    online = authorize(report, policy)
    return {"allocation": allocation, "report": report, "online": online}
`;
  const policy = (
    minEnergy: number,
    minChain: number,
    edges: number[][] = [
      [0, 1],
      [1, 2],
    ],
    start = 0,
    target = 2,
  ) => ({ minEnergy, minChain, edges, start, target });
  const scenario = (
    label: string,
    requests: number[],
    rules: ReturnType<typeof policy>,
    allocation: number[],
    energy: number,
    chain: number,
    online: boolean,
  ) => ({
    label,
    input: [requests, rules],
    expected: { allocation, report: { energy, chain }, online },
  });
  const problem: Problem = {
    id: `${language}-world-integration`,
    title: "中心核の統合テスト",
    concept: "動的計画法・増加部分列・グラフ探索の統合",
    briefing:
      "隣接する回路を同時に選ばず電力を最大化する配分処理を実行する。その結果から電力と増加鎖を復元し最後に信頼経路と必要量を照合する。3つの関数の出力が次の関数の入力になる。",
    objective:
      "distribute → recover → authorize を接続し同点の選択・重複値・循環・未接続・閾値ちょうどの場合でも中心核を正しく制御しよう。",
    functionName: "knotRestoreWorld",
    starter: "",
    solution: "",
    tests: [
      scenario(
        "同点なら後の回路を見送り経路を接続",
        [10, 15, 5],
        policy(30, 1),
        [0, 30, 0],
        30,
        1,
        true,
      ),
      scenario(
        "3本の増加鎖と必要電力ちょうどで接続",
        [8, 1, 10, 1, 12],
        policy(60, 3),
        [16, 0, 20, 0, 24],
        60,
        3,
        true,
      ),
      scenario(
        "経路があっても電力不足なら拒否",
        [12, 12],
        policy(50, 1),
        [24, 0],
        24,
        1,
        false,
      ),
      scenario(
        "循環があっても目的地に届かなければ拒否",
        [-50, 25, 0],
        policy(50, 1, [
          [0, 1],
          [1, 0],
        ]),
        [0, 50, 0],
        50,
        1,
        false,
      ),
      scenario(
        "電力が十分でも増加鎖が短ければ拒否",
        [40, 10, 20],
        policy(50, 2),
        [80, 0, 40],
        120,
        1,
        false,
      ),
      scenario(
        "空の要求と同じ始点終点を処理",
        [],
        policy(0, 0, [], 3, 3),
        [],
        0,
        0,
        true,
      ),
      scenario(
        "同じ電力は増加鎖を伸ばさない",
        [5, 0, 5],
        policy(20, 2),
        [10, 0, 10],
        20,
        1,
        false,
      ),
      scenario(
        "最適配分と循環を含む到達経路を接続",
        [2, 7, 9, 3, 1],
        policy(
          24,
          2,
          [
            [0, 1],
            [1, 0],
            [1, 2],
            [2, 3],
          ],
          0,
          3,
        ),
        [4, 0, 18, 0, 2],
        24,
        2,
        true,
      ),
    ],
    hints: [
      "allocation が違うなら隣接を避ける配分の復元を確認しよう。同点のときは現在の回路を選びません。",
      "report の energy は正の電力の合計。chain は正の値だけで作る厳密な増加部分列の長さです。同じ値では伸びません。",
      "online だけが違う場合は必要量と始点から目的地への有向経路を調べよう。訪問済みの集合を使うと循環も扱えます。",
    ],
    explanation:
      "配分で選んだ回路が復旧できる電力と増加鎖を決めます。その結果と信頼経路の両方が中心核の接続を左右します。個別に正しいだけでは足りない部品の組み合わせを境界条件を含めて確認できました。",
  };
  return { problem, code: `${implementations.join("\n\n")}\n\n${harness}` };
}
