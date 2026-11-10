import type { Course, Language, Problem, Stage, TestCase } from "../types";
import { buildCampaign } from "./campaign";

/**
 * 問題を増やすときは説明・初期コード・正解例・テストを一組で追加します。
 * input は関数へ渡す引数の配列です。配列をひとつ渡す場合は [[1, 2, 3]]。
 * solution は教材制作者向けの見本です。採点は solution との文字列比較では行いません。
 */
type LocalizedCode = { javascript: string; python: string };
type ProblemSeed = Omit<Problem, "starter" | "solution"> & {
  starter: LocalizedCode;
  solution: LocalizedCode;
};
const test = (
  label: string,
  input: unknown[],
  expected: unknown,
): TestCase => ({ label, input, expected });

function problem(language: Language, seed: ProblemSeed): Problem {
  return {
    ...seed,
    id: `${language}-${seed.id}`,
    starter: seed.starter[language],
    solution: seed.solution[language],
  };
}
function stages(language: Language): Stage[] {
  const p = (seed: ProblemSeed) => problem(language, seed);
  const js = language === "javascript";
  return [
    {
      id: `${language}-home`,
      title: "小さな光をもう一度。",
      subtitle: "はじまりの拠点",
      location: "HOME NODE",
      kind: "tutorial",
      intro:
        "ここはあなたが暮らす仮想世界「コモンズ」。ある朝拠点の灯りが消えいつもの挨拶も聞こえなくなった。案内役のNAVIと一緒に小さなコードの修復から始めよう。",
      outro:
        "灯りがともり聞き慣れた声が戻った。「おかえり」。けれど窓の向こうの街はまだ暗い。あなたの直したコードが次の誰かを助けられる。",
      problems: [
        p({
          id: "greeting",
          title: "消えた挨拶",
          concept: "文字列と戻り値",
          briefing:
            "入口の案内端末が「…」としか話さない。まずは端末が返す言葉を変えてみよう。コードの中の引用符で囲まれた文字は「文字列」というデータです。",
          objective:
            "greet() が文字列「おかえり」を返すように直そう。引数はありません。",
          functionName: "greet",
          starter: {
            javascript: 'function greet() {\n  return "…";\n}',
            python: 'def greet():\n    return "…"',
          },
          solution: {
            javascript: 'function greet() {\n  return "おかえり";\n}',
            python: 'def greet():\n    return "おかえり"',
          },
          tests: [test("端末が「おかえり」と話す", [], "おかえり")],
          hints: [
            "引用符の内側だけを書き換えてみよう。",
            "return は関数から結果を返す命令です。返したい言葉を引用符で囲みます。",
            js
              ? 'return "おかえり"; にして実行しよう。'
              : 'return "おかえり" にして実行しよう。',
          ],
          explanation:
            "文字列は言葉やメッセージを扱うデータです。return で返した言葉が端末の挨拶になりました。引用符は残してその中身を変えれば別の言葉も返せます。",
        }),
        p({
          id: "battery",
          title: "灯りのエネルギー",
          concept: "数値と計算",
          briefing:
            "エネルギーセル1個につき灯りに5の電力を送れる。ところが計算装置がセルの個数に5を足してしまっている。cells は受け取ったセルの個数です。",
          objective: "power(cells) が「cells × 5」を返すように直そう。",
          functionName: "power",
          starter: {
            javascript: "function power(cells) {\n  return cells + 5;\n}",
            python: "def power(cells):\n    return cells + 5",
          },
          solution: {
            javascript: "function power(cells) {\n  return cells * 5;\n}",
            python: "def power(cells):\n    return cells * 5",
          },
          tests: [
            test("セル1個で電力5", [1], 5),
            test("セル3個で電力15", [3], 15),
            test("セル0個なら電力0", [0], 0),
          ],
          hints: [
            "いまの + は足し算です。必要なのは掛け算。",
            "プログラムの掛け算には × ではなく * を使います。",
            "cells + 5 を cells * 5 に直そう。",
          ],
          explanation:
            "変数 cells には呼び出すたびに違う個数が入ります。* で掛け算すればどんな個数でも同じルールで電力を計算できます。0の場合もテストすると安心です。",
        }),
        p({
          id: "signal",
          title: "返ってこない信号",
          concept: "引数と変数",
          briefing:
            "拠点の通信装置は受け取った信号をそのまま返すはず。でも今はいつも0を返している。value という引数には外から渡された値が入っています。",
          objective:
            "echo(value) が受け取った value をそのまま返すように直そう。",
          functionName: "echo",
          starter: {
            javascript: "function echo(value) {\n  return 0;\n}",
            python: "def echo(value):\n    return 0",
          },
          solution: {
            javascript: "function echo(value) {\n  return value;\n}",
            python: "def echo(value):\n    return value",
          },
          tests: [
            test("信号7が戻る", [7], 7),
            test("信号42が戻る", [42], 42),
            test("文字の信号も戻る", ["HELLO"], "HELLO"),
          ],
          hints: [
            "0という決まった値ではなく引数の名前を使います。",
            "value は引用符で囲まずに書くとその中に入っている値を使えます。",
            js ? "return value; にしてみよう。" : "return value にしてみよう。",
          ],
          explanation:
            '引数は関数に渡す材料戻り値は関数が返す結果です。名前を引用符で囲むと "value" という文字になってしまいます。変数の中身を使うときはその名前を書きます。',
        }),
      ],
    },
    {
      id: `${language}-city`,
      title: "眠らない街を取り戻せ。",
      subtitle: "コモンズの街",
      location: "COMMONS CITY",
      kind: "repair",
      intro:
        "街へ出るとゲートも配送ドローンも止まっていた。「進んでいいか」を決めるコードが書き換えられている。条件を読み解いて住人たちの日常を取り戻そう。",
      outro:
        "ゲートが開き配送ドローンが飛び立つ。街の灯りがひとつずつ戻っていく。しかし障害の発信元はこの街の外にあるらしい。通信塔から遠くの都市の救援信号が届いた。",
      problems: [
        p({
          id: "gate",
          title: "閉じたままのゲート",
          concept: "比較と条件分岐",
          briefing:
            "ゲートはエネルギーが50以上なら開く。いまは条件が逆になり電力が足りないときだけ開いてしまう。「以上」にはちょうど50も含まれます。",
          objective:
            "canOpen(energy) がenergy が50以上のときだけ真を返すように直そう。",
          functionName: "canOpen",
          starter: {
            javascript: "function canOpen(energy) {\n  return energy < 50;\n}",
            python: "def canOpen(energy):\n    return energy < 50",
          },
          solution: {
            javascript: "function canOpen(energy) {\n  return energy >= 50;\n}",
            python: "def canOpen(energy):\n    return energy >= 50",
          },
          tests: [
            test("電力49では閉じる", [49], false),
            test("電力50で開く", [50], true),
            test("電力80で開く", [80], true),
          ],
          hints: [
            "< は「より小さい」です。必要な向きを考えてみよう。",
            ">= は「以上」> は「より大きい」です。50も通す必要があります。",
            "energy < 50 を energy >= 50 に直そう。",
          ],
          explanation:
            "比較の結果は真か偽になります。>= は境界の値も含みます。49・50・80のように境界の前後を確かめると条件の間違いを見つけやすくなります。",
        }),
        p({
          id: "beacon",
          title: "逆さまの案内灯",
          concept: "if と分岐",
          briefing:
            "案内灯は接続中なら「接続中」切断中なら「切断中」と表示する。でも表示が逆さまだ。online には真か偽のどちらかが渡されます。",
          objective:
            "connectionLabel(online) の2つの表示を正しい位置に直そう。",
          functionName: "connectionLabel",
          starter: {
            javascript:
              'function connectionLabel(online) {\n  if (online) {\n    return "切断中";\n  }\n  return "接続中";\n}',
            python:
              'def connectionLabel(online):\n    if online:\n        return "切断中"\n    return "接続中"',
          },
          solution: {
            javascript:
              'function connectionLabel(online) {\n  if (online) {\n    return "接続中";\n  }\n  return "切断中";\n}',
            python:
              'def connectionLabel(online):\n    if online:\n        return "接続中"\n    return "切断中"',
          },
          tests: [
            test("オンライン時の表示", [true], "接続中"),
            test("オフライン時の表示", [false], "切断中"),
          ],
          hints: [
            "if の中は条件が真のときに実行されます。",
            "online が真ならif の中で「接続中」を返す必要があります。",
            "2か所の「接続中」と「切断中」を入れ替えよう。",
          ],
          explanation:
            "if は条件によって処理を選ぶ命令です。条件が真なら内側へ進みます。return に到達すると関数はそこで終了するのでそれより下は実行されません。",
        }),
        p({
          id: "drone",
          title: "配送ドローンの安全装置",
          concept: "複数の条件",
          briefing:
            "ドローンは「電力が20以上」かつ「経路が安全」の両方を満たすときだけ出発する。どちらか片方だけで飛んでしまう安全装置を修復しよう。",
          objective:
            "canLaunch(energy, safe) が両方の条件を満たすときだけ真を返すように直そう。",
          functionName: "canLaunch",
          starter: {
            javascript:
              "function canLaunch(energy, safe) {\n  return energy >= 20 || safe;\n}",
            python:
              "def canLaunch(energy, safe):\n    return energy >= 20 or safe",
          },
          solution: {
            javascript:
              "function canLaunch(energy, safe) {\n  return energy >= 20 && safe;\n}",
            python:
              "def canLaunch(energy, safe):\n    return energy >= 20 and safe",
          },
          tests: [
            test("電力と経路が両方OK", [20, true], true),
            test("電力不足なら待機", [19, true], false),
            test("危険な経路なら待機", [80, false], false),
            test("両方不足でも待機", [0, false], false),
          ],
          hints: [
            "今の演算子は「どちらかが真なら真」という意味です。",
            js
              ? "&& は「かつ」|| は「または」です。"
              : "and は「かつ」or は「または」です。",
            js ? "|| を && に変えよう。" : "or を and に変えよう。",
          ],
          explanation:
            "複数の条件を「かつ」でつなぐとすべてを満たしたときだけ真になります。組み合わせごとにテストすることで片方だけ満たすケースの不具合も防げます。",
        }),
      ],
    },
    {
      id: `${language}-network`,
      title: "遠くの誰かへ光を。",
      subtitle: "都市間ネットワーク",
      location: "NETWORK SPINE",
      kind: "repair",
      intro:
        "通信塔の向こうには同じように助けを待つ都市があった。たくさんの端末やデータをひとつずつ正しく処理する必要がある。繰り返しと配列の力で都市同士をつなぎ直そう。",
      outro:
        "切れていた光の道が遠くの都市まで伸びていく。だが世界の中心「ルート・コア」から最後の警告が届いた。世界を支えるサーバー群が停止寸前だ。今までの経験をひとつにつなぐ時が来た。",
      problems: [
        p({
          id: "sum",
          title: "足りない送電量",
          concept: "ループと合計",
          briefing:
            "values は各都市から届くエネルギーの配列です。配列は複数の値を順番に並べたもの。合計装置が最初から1を持っていて結果がいつも1だけ多くなっている。",
          objective:
            "totalEnergy(values) が配列内の数値の合計を返すように直そう。空の配列なら0です。",
          functionName: "totalEnergy",
          starter: {
            javascript:
              "function totalEnergy(values) {\n  let total = 1;\n  for (const value of values) {\n    total = total + value;\n  }\n  return total;\n}",
            python:
              "def totalEnergy(values):\n    total = 1\n    for value in values:\n        total = total + value\n    return total",
          },
          solution: {
            javascript:
              "function totalEnergy(values) {\n  let total = 0;\n  for (const value of values) {\n    total = total + value;\n  }\n  return total;\n}",
            python:
              "def totalEnergy(values):\n    total = 0\n    for value in values:\n        total = total + value\n    return total",
          },
          tests: [
            test("3都市のエネルギーを合計", [[10, 20, 30]], 60),
            test("1都市のエネルギー", [[5]], 5),
            test("届いていないときは0", [[]], 0),
          ],
          hints: [
            "for は配列の値をひとつずつ取り出します。合計の開始値を見てみよう。",
            "何も足していない最初の合計は0であるべきです。",
            js
              ? "let total = 1; を let total = 0; に直そう。"
              : "total = 1 を total = 0 に直そう。",
          ],
          explanation:
            "合計用の変数を0から始めループでひとつずつ足しました。空の配列ならループの中は一度も実行されず最初の0を返します。",
        }),
        p({
          id: "filter",
          title: "ノイズに埋もれた通信",
          concept: "配列と条件分岐",
          briefing:
            "通信値が正の数なら正常0以下ならノイズ。正常な通信だけを新しい配列に順番どおり集めよう。今は条件が逆でノイズだけを集めている。",
          objective:
            "cleanPackets(values) が0より大きい数だけを残した配列を返すように直そう。",
          functionName: "cleanPackets",
          starter: {
            javascript:
              "function cleanPackets(values) {\n  const clean = [];\n  for (const value of values) {\n    if (value <= 0) {\n      clean.push(value);\n    }\n  }\n  return clean;\n}",
            python:
              "def cleanPackets(values):\n    clean = []\n    for value in values:\n        if value <= 0:\n            clean.append(value)\n    return clean",
          },
          solution: {
            javascript:
              "function cleanPackets(values) {\n  const clean = [];\n  for (const value of values) {\n    if (value > 0) {\n      clean.push(value);\n    }\n  }\n  return clean;\n}",
            python:
              "def cleanPackets(values):\n    clean = []\n    for value in values:\n        if value > 0:\n            clean.append(value)\n    return clean",
          },
          tests: [
            test("正常な通信だけ残す", [[4, -1, 0, 8, -3]], [4, 8]),
            test("ノイズだけなら空", [[0, -2]], []),
            test("正常な順序を保つ", [[3, 1, 2]], [3, 1, 2]),
            test("空の通信列", [[]], []),
          ],
          hints: [
            "新しい配列に入れるのは正常な値だけです。",
            "正常なのは「0より大きい」数。0は含めません。",
            "value <= 0 を value > 0 に直そう。",
          ],
          explanation: js
            ? "条件を満たす値を push で新しい配列に追加しました。条件でデータを選び出す処理を「フィルタリング」と呼びます。"
            : "条件を満たす値を append で新しい配列に追加しました。条件でデータを選び出す処理を「フィルタリング」と呼びます。",
        }),
        p({
          id: "relay",
          title: "中継機を数えよう",
          concept: "カウンター",
          briefing:
            "signals は中継機からの応答です。1は稼働中0は停止中。稼働中の台数を数える処理が1台見つかるたびに2台ぶん加算している。",
          objective:
            "countOnline(signals) が値が1の要素の個数を返すように直そう。",
          functionName: "countOnline",
          starter: {
            javascript:
              "function countOnline(signals) {\n  let count = 0;\n  for (const signal of signals) {\n    if (signal === 1) {\n      count = count + 2;\n    }\n  }\n  return count;\n}",
            python:
              "def countOnline(signals):\n    count = 0\n    for signal in signals:\n        if signal == 1:\n            count = count + 2\n    return count",
          },
          solution: {
            javascript:
              "function countOnline(signals) {\n  let count = 0;\n  for (const signal of signals) {\n    if (signal === 1) {\n      count = count + 1;\n    }\n  }\n  return count;\n}",
            python:
              "def countOnline(signals):\n    count = 0\n    for signal in signals:\n        if signal == 1:\n            count = count + 1\n    return count",
          },
          tests: [
            test("3台が稼働中", [[1, 0, 1, 1]], 3),
            test("全台停止", [[0, 0]], 0),
            test("1台だけ稼働", [[1]], 1),
            test("まだ応答がない", [[]], 0),
          ],
          hints: [
            "稼働中の中継機1台につきいくつ増やせばいいでしょう。",
            "count はこれまで見つけた台数。次の1台を見つけたら1だけ増やします。",
            "count + 2 を count + 1 に直そう。",
          ],
          explanation:
            "条件に合うものを見つけるたびに1を足すとその個数を数えられます。合計・選び出し・個数のカウントはたくさんのデータを扱う基本の道具です。",
        }),
      ],
    },
    {
      id: `${language}-core`,
      title: "この世界をつなぎとめろ。",
      subtitle: "ルート・コア最終防衛線",
      location: "WORLD ROOT CORE",
      kind: "boss",
      intro:
        "目の前にあるのは世界中の住人の暮らしを支えるサーバー群。認証電力通信の3つの処理が失われている。もう直すためのコードは残っていない。あなた自身のコードでこの世界の明日を書こう。",
      outro:
        "世界中のサーバーに光が戻った。拠点から街から遠くの都市から「ありがとう」が届く。はじまりはたった一行の修正だった。あなたはもうこの世界をつなぐエンジニアだ。",
      problems: [
        p({
          id: "boss-access",
          title: "認証システムを再構築",
          concept: "実装：複数の条件",
          briefing:
            "世界の入口を守る認証処理を書こう。電力が50以上で信頼済みの接続である場合だけアクセスを許可する。関数の中身は自分で実装します。",
          objective:
            "authorize(energy, trusted) を実装しenergy >= 50 かつ trusted が真なら真それ以外は偽を返そう。",
          functionName: "authorize",
          starter: {
            javascript:
              "function authorize(energy, trusted) {\n  // ここから自分で実装しよう\n}",
            python:
              "def authorize(energy, trusted):\n    # ここから自分で実装しよう\n    pass",
          },
          solution: {
            javascript:
              "function authorize(energy, trusted) {\n  return energy >= 50 && trusted;\n}",
            python:
              "def authorize(energy, trusted):\n    return energy >= 50 and trusted",
          },
          tests: [
            test("電力50・信頼済みなら許可", [50, true], true),
            test("電力49なら拒否", [49, true], false),
            test("未認証なら拒否", [100, false], false),
            test("どちらも不足なら拒否", [0, false], false),
          ],
          hints: [
            "街のドローンと同じく2つの条件を両方満たす必要があります。",
            js
              ? "energy >= 50 と trusted を && でつなぎreturn します。"
              : "energy >= 50 と trusted を and でつなぎreturn します。",
            js
              ? "return energy >= 50 && trusted; と書けます。"
              : "pass を消しreturn energy >= 50 and trusted と書けます。",
          ],
          explanation:
            "比較と論理演算子を組み合わせて世界の認証処理を作りました。短い式でも満たすべきルールを正確に表現できれば重要なシステムを支えられます。",
        }),
        p({
          id: "boss-power",
          title: "電力配分を再構築",
          concept: "実装：ループと配列",
          briefing:
            "各サーバーの要求電力が配列で届く。要求が1以上ならその2倍を配り0以下の要求には0を割り当てる。入力と同じ順序・同じ長さの配列を返そう。",
          objective:
            "distribute(requests) を実装し各値が正なら2倍0以下なら0にした配列を返そう。例：[3, 0, -1, 5] → [6, 0, 0, 10]。",
          functionName: "distribute",
          starter: {
            javascript:
              "function distribute(requests) {\n  // 配列を作り順番に処理して返そう\n}",
            python:
              "def distribute(requests):\n    # 配列を作り順番に処理して返そう\n    pass",
          },
          solution: {
            javascript:
              "function distribute(requests) {\n  const result = [];\n  for (const request of requests) {\n    if (request > 0) {\n      result.push(request * 2);\n    } else {\n      result.push(0);\n    }\n  }\n  return result;\n}",
            python:
              "def distribute(requests):\n    result = []\n    for request in requests:\n        if request > 0:\n            result.append(request * 2)\n        else:\n            result.append(0)\n    return result",
          },
          tests: [
            test("異なる要求に配分する", [[3, 0, -1, 5]], [6, 0, 0, 10]),
            test("正常な要求を2倍に", [[1, 4]], [2, 8]),
            test("不正な要求には0", [[-2, 0]], [0, 0]),
            test("サーバー未接続", [[]], []),
          ],
          hints: [
            "空の結果配列を作りfor で requests をひとつずつ処理します。",
            js
              ? "if と else で分けresult.push(...) で2倍した値または0を追加します。"
              : "if と else で分けresult.append(...) で2倍した値または0を追加します。",
            js
              ? "const result = []; → for (const request of requests) → if (request > 0) なら result.push(request * 2)else なら result.push(0)。最後は return result;"
              : "result = [] → for request in requests: → if request > 0: なら result.append(request * 2)else: なら result.append(0)。最後は return result",
          ],
          explanation:
            "ループ・条件分岐・配列を組み合わせました。今回はノイズを取り除くのではなく0に置き換えるので入力と出力の長さは同じです。要求された仕様を読み分けることも実装の大切な一部です。",
        }),
        p({
          id: "boss-recovery",
          title: "最後の復旧信号",
          concept: "実装：選別と集計",
          briefing:
            "世界各地から復旧信号が届いている。正の値は復旧した通信量0以下は無効な信号だ。有効な通信量だけを合計し世界に復旧完了を知らせよう。",
          objective:
            "recover(signals) を実装し0より大きい数だけの合計を返そう。例：[10, -3, 0, 20] → 30。",
          functionName: "recover",
          starter: {
            javascript:
              "function recover(signals) {\n  // 世界をつなぐ最後の処理を書こう\n}",
            python:
              "def recover(signals):\n    # 世界をつなぐ最後の処理を書こう\n    pass",
          },
          solution: {
            javascript:
              "function recover(signals) {\n  let total = 0;\n  for (const signal of signals) {\n    if (signal > 0) {\n      total = total + signal;\n    }\n  }\n  return total;\n}",
            python:
              "def recover(signals):\n    total = 0\n    for signal in signals:\n        if signal > 0:\n            total = total + signal\n    return total",
          },
          tests: [
            test("世界各地の有効通信を合計", [[10, -3, 0, 20]], 30),
            test("ノイズだけなら0", [[-4, 0, -1]], 0),
            test("正常な信号だけの合計", [[1, 2, 3]], 6),
            test("まだ信号がない", [[]], 0),
          ],
          hints: [
            "「合計」と「正常なデータの選別」を組み合わせます。",
            "合計を0で用意しループの中で正の信号だけを合計に足します。",
            js
              ? "let total = 0; と for (const signal of signals) を用意しif (signal > 0) の中で total = total + signal;。最後に return total;"
              : "total = 0 と for signal in signals: を用意しif signal > 0: の中で total = total + signal。最後に return total",
          ],
          explanation:
            "最初は言葉をひとつ変えるだけだったあなたが条件分岐とループを組み合わせて世界の通信を復旧しました。ここで使った「選び処理し結果を返す」という考え方はこれから作るさまざまなプログラムにつながります。",
        }),
      ],
    },
  ];
}

export const legacyCourses: Record<Language, Course> = {
  javascript: {
    language: "javascript",
    label: "JavaScript",
    stages: stages("javascript"),
  },
  python: { language: "python", label: "Python", stages: stages("python") },
};

export const courses: Record<Language, Course> = {
  javascript: buildCampaign("javascript", legacyCourses.javascript),
  python: buildCampaign("python", legacyCourses.python),
};
