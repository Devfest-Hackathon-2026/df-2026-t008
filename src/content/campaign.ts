import type { Course, Language, Problem, Stage, TestCase } from "../types";

type Seed = {
  id: string;
  title: string;
  concept: string;
  briefing: string;
  objective: string;
  objectivePy?: string;
  functionName: string;
  parameters: string;
  js: string;
  py: string;
  starterJs?: string;
  starterPy?: string;
  cases: TestCase[];
  hints: [string, string, string];
  hintsPy?: [string, string, string];
  explanation: string;
  explanationPy?: string;
};
const t = (label: string, input: unknown[], expected: unknown): TestCase => ({
  label,
  input,
  expected,
});

const basic: Seed[] = [
  {
    id: "outer-add",
    title: "予備セルをつなぐ",
    concept: "足し算と2つの引数",
    briefing: "離れた2本の電源にあるセルを合わせて予備電源を作ろう。",
    objective: "combineCells(a, b) が0以上の整数aとbの合計を返すように直そう。",
    functionName: "combineCells",
    parameters: "a, b",
    js: "return a + b;",
    py: "return a + b",
    starterJs: "return a - b;",
    starterPy: "return a - b",
    cases: [
      t("セル3個と4個", [3, 4], 7),
      t("予備が空", [5, 0], 5),
      t("どちらも空", [0, 0], 0),
    ],
    hints: [
      "2本の電源を合わせる操作です。",
      "引き算の - と足し算の + を見比べよう。",
      "a + b を返せば2つの個数を合計できます。",
    ],
    explanation:
      "2つの引数を受け取ると呼び出す側の組み合わせに応じた計算ができます。0でも同じ式が使えます。",
  },
  {
    id: "outer-remaining",
    title: "使った電力を差し引く",
    concept: "引き算",
    briefing: "端末に残った電力が足し算で表示されている。使用分を取り除こう。",
    objective:
      "remainingPower(total, used) がtotalからusedを引いた整数を返すように直そう。0 ≤ used ≤ totalです。",
    functionName: "remainingPower",
    parameters: "total, used",
    js: "return total - used;",
    py: "return total - used",
    starterJs: "return total + used;",
    starterPy: "return total + used",
    cases: [
      t("10から3を使用", [10, 3], 7),
      t("全部使用", [8, 8], 0),
      t("まだ未使用", [12, 0], 12),
    ],
    hints: [
      "残りは使う前より少なくなります。",
      "使用量を total から引こう。",
      "return total - used の形を考えよう。",
    ],
    explanation:
      "引き算は順序が大切です。used - total にすると残量の符号が逆になってしまいます。",
  },
  {
    id: "outer-area",
    title: "修復パネルの面積",
    concept: "掛け算",
    briefing: "床の穴を長方形のパネルでふさぐ。必要なマスの数を計算しよう。",
    objective:
      "panelArea(width, height) が0以上の整数の幅と高さの積を返すように直そう。",
    functionName: "panelArea",
    parameters: "width, height",
    js: "return width * height;",
    py: "return width * height",
    starterJs: "return width + height;",
    starterPy: "return width + height",
    cases: [
      t("幅4高さ3", [4, 3], 12),
      t("細いパネル", [1, 9], 9),
      t("高さ0", [5, 0], 0),
    ],
    hints: [
      "1段あたりのマス数と段数を使います。",
      "幅を高さの回数だけ足す計算は掛け算です。",
      "width * height を返そう。",
    ],
    explanation:
      "同じ数が何段もあるときは掛け算でまとめられます。0の段数では面積も0です。",
  },
  {
    id: "outer-clock",
    title: "タイマーの単位を戻す",
    concept: "定数を使う計算",
    briefing: "作業時間の分を秒に直して通信タイマーへ渡そう。",
    objective:
      "toSeconds(minutes) が0以上の整数の分数を秒数に変換して返すように直そう。1分は60秒です。",
    functionName: "toSeconds",
    parameters: "minutes",
    js: "return minutes * 60;",
    py: "return minutes * 60",
    starterJs: "return minutes + 60;",
    starterPy: "return minutes + 60",
    cases: [t("2分", [2], 120), t("1分", [1], 60), t("待ち時間なし", [0], 0)],
    hints: [
      "1分ごとに60秒ずつ増えます。",
      "60を1回だけ足すのではありません。",
      "minutes * 60 が秒数です。",
    ],
    explanation:
      "単位の変換では1単位あたりの量を掛けます。式にした変換規則はどの入力にも使えます。",
  },
  {
    id: "outer-parity",
    title: "交互に点く信号",
    concept: "余りと偶数",
    briefing: "番号が偶数の端末だけ青く点灯する回路を修復しよう。",
    objective:
      "isEven(number) が0以上の整数numberが偶数なら真を返し奇数なら偽を返すように直そう。",
    functionName: "isEven",
    parameters: "number",
    js: "return number % 2 === 0;",
    py: "return number % 2 == 0",
    starterJs: "return number % 2 === 1;",
    starterPy: "return number % 2 == 1",
    cases: [
      t("偶数8", [8], true),
      t("奇数7", [7], false),
      t("0も偶数", [0], true),
    ],
    hints: [
      "2で割った余りに着目しよう。",
      "% は割り算の余りです。",
      "余りが0なら2で割り切れます。",
    ],
    explanation:
      "余りを使うと番号を周期的に分類できます。偶数には0も含まれます。",
  },
  {
    id: "outer-greeting-name",
    title: "名前を添えた案内",
    concept: "文字列の連結",
    briefing:
      "案内ロボットが訪れた人の名前を呼べなくなった。挨拶と名前をつなごう。",
    objective:
      "welcomeName(name) が文字列「こんにちは 」の後ろにnameをつないだ文字列を返すように直そう。空白は1個です。",
    functionName: "welcomeName",
    parameters: "name",
    js: 'return "こんにちは " + name;',
    py: 'return "こんにちは " + name',
    starterJs: 'return "こんにちは name";',
    starterPy: 'return "こんにちは name"',
    cases: [
      t("NAVIを案内", ["NAVI"], "こんにちは NAVI"),
      t("旅人を案内", ["旅人"], "こんにちは 旅人"),
      t("名前が空", [""], "こんにちは "),
    ],
    hints: [
      "引用符の内側にnameと書くとその文字自体になります。",
      "変数nameは引用符の外で使おう。",
      "挨拶の文字列とnameを + でつなげます。",
    ],
    explanation:
      "文字列同士の + は連結です。固定された言葉と呼び出すたびに変わる名前を分けて書きます。",
  },
  {
    id: "outer-first",
    title: "区画コードの先頭",
    concept: "文字列の添字",
    briefing: "英数字の区画コードから先頭の1文字を読み取る端末を修復しよう。",
    objective:
      "firstSymbol(code) が空ではないASCII文字列codeの先頭の1文字を返すように直そう。",
    functionName: "firstSymbol",
    parameters: "code",
    js: "return code[0];",
    py: "return code[0]",
    starterJs: "return code[1];",
    starterPy: "return code[1]",
    cases: [
      t("A区画", ["A17"], "A"),
      t("数字のコード", ["902"], "9"),
      t("1文字だけ", ["Z"], "Z"),
    ],
    hints: [
      "最初の文字に付く番号を確かめよう。",
      "添字は1ではなく0から数えます。",
      "code[0] が先頭の文字です。",
    ],
    explanation:
      "文字列の各位置には0から始まる番号が付きます。英数字の1文字を選ぶにはその添字を指定します。",
  },
  {
    id: "outer-last",
    title: "末尾の確認番号",
    concept: "長さと最後の添字",
    briefing:
      "区画コードの最後の文字が確認番号になっている。文字数から位置を求めよう。",
    objective:
      "lastSymbol(code) が空ではないASCII文字列codeの最後の1文字を返すように直そう。",
    functionName: "lastSymbol",
    parameters: "code",
    js: "return code[code.length - 1];",
    py: "return code[len(code) - 1]",
    starterJs: "return code[0];",
    starterPy: "return code[0]",
    cases: [
      t("確認番号7", ["A17"], "7"),
      t("英字の末尾", ["NODE-Z"], "Z"),
      t("1文字だけ", ["Q"], "Q"),
    ],
    hints: [
      "先頭から数える番号は0から始まります。",
      "最後の添字は文字数より1小さい値です。",
      "JavaScriptはcode.length、Pythonはlen(code)で文字数を得られます。",
    ],
    explanation:
      "長さから位置を計算すると何文字のコードにも対応できます。添字と個数の違いに注意しましょう。",
  },
  {
    id: "outer-length",
    title: "通信枠の文字数",
    concept: "文字列の長さ",
    briefing: "空の通信も含めて送信する文字数を数える端末を修復しよう。",
    objective:
      "messageLength(text) がASCII文字列textの文字数を整数で返すように直そう。空白も数えます。",
    functionName: "messageLength",
    parameters: "text",
    js: "return text.length;",
    py: "return len(text)",
    starterJs: "return 1;",
    starterPy: "return 1",
    cases: [
      t("HELLO", ["HELLO"], 5),
      t("空の通信", [""], 0),
      t("空白を含む", ["A B"], 3),
    ],
    hints: [
      "固定の数では文字数の違いに対応できません。",
      "JavaScriptではlengthプロパティを使います。",
      "Pythonではlen(text)、JavaScriptではtext.lengthを返そう。",
    ],
    explanation: "空白も文字列の一部です。空の文字列の長さは0になります。",
  },
  {
    id: "outer-uppercase",
    title: "標識の大文字化",
    concept: "文字列の変換",
    briefing: "小文字が混ざった英数字の標識を大文字に統一しよう。",
    objective:
      "normalizeSign(text) がASCII文字列textの英小文字を大文字に変えた文字列を返すように直そう。数字や記号はそのままです。",
    functionName: "normalizeSign",
    parameters: "text",
    js: "return text.toUpperCase();",
    py: "return text.upper()",
    starterJs: "return text;",
    starterPy: "return text",
    cases: [
      t("小文字の標識", ["node"], "NODE"),
      t("英数字混在", ["a1-B"], "A1-B"),
      t("空の標識", [""], ""),
    ],
    hints: [
      "文字列を変換する組み込み機能を探そう。",
      "JavaScriptはtoUpperCase、Pythonはupperです。",
      "メソッド名の後ろに()を付けて呼び出します。",
    ],
    explanation:
      "文字列のメソッドは新しい変換結果を返します。その結果をreturnで呼び出し元へ渡します。",
  },
  {
    id: "outer-temperature",
    title: "冷却水の変換式",
    concept: "計算の順序",
    briefing: "冷却設備は摂氏を華氏に変換して記録する。式の順序を修復しよう。",
    objective:
      "toFahrenheit(celsius) が摂氏celsiusを「celsius × 9 ÷ 5 + 32」で華氏へ変換して返すように直そう。入力は5の倍数の整数です。",
    functionName: "toFahrenheit",
    parameters: "celsius",
    js: "return celsius * 9 / 5 + 32;",
    py: "return celsius * 9 / 5 + 32",
    starterJs: "return celsius + 32;",
    starterPy: "return celsius + 32",
    cases: [
      t("水の凍る温度", [0], 32),
      t("水の沸く温度", [100], 212),
      t("負の温度", [-40], -40),
    ],
    hints: [
      "足し算だけでは温度差の倍率が変わりません。",
      "先に9倍して5で割り最後に32を足します。",
      "掛け算と割り算は足し算より先に計算されます。",
    ],
    explanation:
      "複数の演算子をつないだ式にも決まった計算順序があります。必要なら括弧で順序を明確にできます。",
  },
  {
    id: "outer-absolute",
    title: "原点からの距離",
    concept: "条件分岐と符号",
    briefing:
      "位置の値が負でも原点からの距離は負にならない。符号を調整しよう。",
    objective:
      "distanceFromZero(position) が整数positionの絶対値を返すように直そう。",
    functionName: "distanceFromZero",
    parameters: "position",
    js: "return position < 0 ? -position : position;",
    py: "return -position if position < 0 else position",
    starterJs: "return position;",
    starterPy: "return position",
    cases: [t("負の位置", [-7], 7), t("正の位置", [5], 5), t("原点", [0], 0)],
    hints: [
      "負の値だけ符号を反転させよう。",
      "0より小さいかどうかで処理を分けます。",
      "負なら-position、それ以外ならpositionを返そう。",
    ],
    explanation:
      "入力によって返す値を分けるのが条件分岐です。境界である0も確かめておきましょう。",
  },
  {
    id: "outer-minimum",
    title: "短い方の経路",
    concept: "2つの値の比較",
    briefing: "2本の経路の距離を比べて短い方を案内しよう。",
    objective:
      "shorterRoute(a, b) が0以上の整数aとbの小さい方を返すように直そう。同じ値ならその値を返します。",
    functionName: "shorterRoute",
    parameters: "a, b",
    js: "return a < b ? a : b;",
    py: "return a if a < b else b",
    starterJs: "return a > b ? a : b;",
    starterPy: "return a if a > b else b",
    cases: [
      t("左の経路が短い", [3, 9], 3),
      t("右の経路が短い", [8, 2], 2),
      t("同じ長さ", [4, 4], 4),
    ],
    hints: [
      "大きい方ではなく小さい方が必要です。",
      "a < b のとき返したい値を考えよう。",
      "条件が真ならa、それ以外ならbを返せます。",
    ],
    explanation:
      "比較と返り値を組み合わせると候補の選択ができます。同じ値の場合にも結果が一意になるように考えます。",
  },
  {
    id: "outer-range",
    title: "安全温度の窓",
    concept: "2つの比較を組み合わせる",
    briefing: "冷却室の温度が許容範囲にあるときだけゲートを開こう。",
    objective:
      "isSafeTemperature(value, lower, upper) がlower以上upper以下なら真を返すように直そう。lower ≤ upperの整数で両端も安全です。",
    functionName: "isSafeTemperature",
    parameters: "value, lower, upper",
    js: "return value >= lower && value <= upper;",
    py: "return value >= lower and value <= upper",
    starterJs: "return value >= lower || value <= upper;",
    starterPy: "return value >= lower or value <= upper",
    cases: [
      t("範囲の内側", [5, 0, 10], true),
      t("下限ちょうど", [0, 0, 10], true),
      t("上限ちょうど", [10, 0, 10], true),
      t("高すぎる", [11, 0, 10], false),
      t("低すぎる", [-1, 0, 10], false),
    ],
    hints: [
      "下限と上限の両方を満たす必要があります。",
      "「または」ではなく「かつ」を使おう。",
      "JavaScriptは&&、Pythonはandで2つの比較をつなぎます。",
    ],
    explanation:
      "範囲判定では片方だけを満たしても安全とはいえません。端を含むかどうかも条件の一部です。",
  },
];

const expert: Seed[] = [
  {
    id: "expert-window",
    title: "重複しない通信窓",
    concept: "スライディングウィンドウ",
    briefing:
      "同じ記号が混ざると通信窓が壊れる。重複なしで連続して読める最長の区間を探そう。",
    objective:
      "longestUniqueWindow(text) がASCII文字列textのうち同じ文字を2回含まない連続部分文字列の最大長を返す関数を実装しよう。空文字列では0です。",
    functionName: "longestUniqueWindow",
    parameters: "text",
    js: `const last = new Map();
let left = 0, best = 0;
for (let right = 0; right < text.length; right++) {
  const character = text[right];
  if (last.has(character)) left = Math.max(left, last.get(character) + 1);
  last.set(character, right);
  best = Math.max(best, right - left + 1);
}
return best;`,
    py: `last = {}
left = 0
best = 0
for right, character in enumerate(text):
    if character in last:
        left = max(left, last[character] + 1)
    last[character] = right
    best = max(best, right - left + 1)
return best`,
    cases: [
      t("重複から窓を進める", ["abcabcbb"], 3),
      t("全部同じ", ["aaaa"], 1),
      t("左端を戻さない", ["abba"], 2),
      t("空の通信", [""], 0),
      t("離れた記号は飛ばせない", ["pwwkew"], 3),
    ],
    hints: [
      "区間の左端と右端を管理すると毎回すべてを数え直さずに済みます。",
      "各文字が最後に現れた添字を記録し重複したら左端をその次へ進めよう。",
      "左端は現在値より小さく戻さないようmaxを使いright - left + 1で窓の長さを更新します。",
    ],
    explanation:
      "過去の出現位置を記録すると右端を一度ずつ進めながら重複のない区間を維持できます。左端を後退させないという条件が正しさの鍵です。",
  },
  {
    id: "expert-coins",
    title: "最小セルで電力を作る",
    concept: "動的計画法と到達不能",
    briefing:
      "異なる容量のセルを組み合わせて必要電力をぴったり作ろう。各種類のセルは何個でも使えます。",
    objective:
      "minimumCells(capacities, target) が正の整数配列capacitiesを何度でも使って0以上の整数targetを作る最小個数を返す関数を実装しよう。作れないなら-1。targetは0〜200です。",
    functionName: "minimumCells",
    parameters: "capacities, target",
    js: `const best = Array(target + 1).fill(Infinity);
best[0] = 0;
for (let value = 1; value <= target; value++) {
  for (const capacity of capacities) {
    if (capacity <= value) best[value] = Math.min(best[value], best[value - capacity] + 1);
  }
}
return Number.isFinite(best[target]) ? best[target] : -1;`,
    py: `best = [float("inf")] * (target + 1)
best[0] = 0
for value in range(1, target + 1):
    for capacity in capacities:
        if capacity <= value:
            best[value] = min(best[value], best[value - capacity] + 1)
return -1 if best[target] == float("inf") else best[target]`,
    cases: [
      t("大きいセル優先では失敗する", [[1, 3, 4], 6], 2),
      t("作れない電力", [[2, 4], 7], -1),
      t("必要電力0", [[2, 5], 0], 0),
      t("セルがない", [[], 3], -1),
      t("同じ種類を再利用", [[2, 5], 10], 2),
    ],
    hints: [
      "大きいセルから選ぶ方法が常に最少とは限りません。",
      "各電力量を作る最小個数を0からtargetまで表に保存しよう。",
      "best[value - capacity] + 1を候補にして最小値を採用します。到達不能の値は別に扱います。",
    ],
    explanation:
      "小さな電力量の最適解から大きな電力量の最適解を作るのが動的計画法です。作れない状態と0個で作れる状態を区別する必要があります。",
  },
  {
    id: "expert-shortest-grid",
    title: "閉鎖区画の最短ルート",
    concept: "幅優先探索と距離",
    briefing:
      "内核へ続く通路には閉鎖されたマスがある。歩けるマスを順に調べ最短の移動回数を求めよう。",
    objective:
      "shortestRoute(grid) が左上から右下へ上下左右で進む最小移動回数を返す関数を実装しよう。0は通路、1は壁です。長方形の配列で縦横1〜12。到達不能または始点・終点が壁なら-1です。",
    functionName: "shortestRoute",
    parameters: "grid",
    js: `const rows = grid.length, cols = grid[0].length;
if (grid[0][0] === 1 || grid[rows - 1][cols - 1] === 1) return -1;
const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
const queue = [[0, 0, 0]];
seen[0][0] = true;
for (let head = 0; head < queue.length; head++) {
  const [row, col, distance] = queue[head];
  if (row === rows - 1 && col === cols - 1) return distance;
  for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nextRow = row + dr, nextCol = col + dc;
    if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols && !seen[nextRow][nextCol] && grid[nextRow][nextCol] === 0) {
      seen[nextRow][nextCol] = true;
      queue.push([nextRow, nextCol, distance + 1]);
    }
  }
}
return -1;`,
    py: `rows, cols = len(grid), len(grid[0])
if grid[0][0] == 1 or grid[rows - 1][cols - 1] == 1:
    return -1
seen = {(0, 0)}
queue = [(0, 0, 0)]
head = 0
while head < len(queue):
    row, col, distance = queue[head]
    head += 1
    if row == rows - 1 and col == cols - 1:
        return distance
    for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
        nr, nc = row + dr, col + dc
        if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen and grid[nr][nc] == 0:
            seen.add((nr, nc))
            queue.append((nr, nc, distance + 1))
return -1`,
    cases: [
      t(
        "壁をよけて進む",
        [
          [
            [0, 1, 0],
            [0, 0, 0],
            [1, 1, 0],
          ],
        ],
        4,
      ),
      t(
        "進めない",
        [
          [
            [0, 1],
            [1, 0],
          ],
        ],
        -1,
      ),
      t("始点が終点", [[[0]]], 0),
      t(
        "終点が壁",
        [
          [
            [0, 0],
            [0, 1],
          ],
        ],
        -1,
      ),
      t(
        "回り道が必要",
        [
          [
            [0, 0, 0, 0],
            [1, 1, 1, 0],
            [0, 0, 0, 0],
            [0, 1, 1, 1],
            [0, 0, 0, 0],
          ],
        ],
        13,
      ),
    ],
    hints: [
      "近い場所から順に調べると最初に終点へ着いた距離が最短になります。",
      "待ち行列に位置と距離を入れ上下左右の未訪問の通路を追加します。",
      "追加した時点で訪問済みにしよう。同じマスを何度も追加すると探索が増え続けます。",
    ],
    explanation:
      "幅優先探索は移動回数が等しい辺を持つ経路で最短距離を求められます。壁・配列の外・訪問済みの3つを除くことで探索が有限に終わります。",
  },
  {
    id: "expert-intervals",
    title: "重なる復旧予約",
    concept: "区間の整列と統合",
    briefing:
      "同時に作業できる復旧予約をまとめて設備の切り替え回数を減らそう。予約の順番はばらばらです。",
    objective:
      "mergeReservations(intervals) が[start, end]の配列を開始順に並べ、重なるか端が接する区間をまとめた新しい配列を返す関数を実装しよう。整数start ≤ end。空なら[]です。",
    functionName: "mergeReservations",
    parameters: "intervals",
    js: `const sorted = intervals.map(pair => pair.slice()).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const merged = [];
for (const [start, end] of sorted) {
  if (merged.length === 0 || start > merged[merged.length - 1][1]) merged.push([start, end]);
  else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
}
return merged;`,
    py: `merged = []
for start, end in sorted(intervals):
    if not merged or start > merged[-1][1]:
        merged.append([start, end])
    else:
        merged[-1][1] = max(merged[-1][1], end)
return merged`,
    cases: [
      t(
        "重なる予約",
        [
          [
            [1, 3],
            [2, 6],
            [8, 10],
          ],
        ],
        [
          [1, 6],
          [8, 10],
        ],
      ),
      t(
        "順番と接する端",
        [
          [
            [5, 7],
            [1, 3],
            [3, 5],
          ],
        ],
        [[1, 7]],
      ),
      t(
        "内側に含まれる",
        [
          [
            [1, 9],
            [2, 3],
            [4, 4],
          ],
        ],
        [[1, 9]],
      ),
      t("予約なし", [[]], []),
      t(
        "離れた区間",
        [
          [
            [8, 9],
            [0, 0],
          ],
        ],
        [
          [0, 0],
          [8, 9],
        ],
      ),
    ],
    hints: [
      "開始位置で整列すると今までの最後の区間だけと比較できます。",
      "次の開始が最後の終了以下なら区間を統合します。",
      "終了位置は現在値と次の終了の最大値に更新します。次の終了でそのまま上書きしないように。",
    ],
    explanation:
      "整列によって複雑な比較を一方向の走査に変えられます。統合中の区間が先の区間を含む場合には終了位置を短くしないことが大切です。",
  },
  {
    id: "expert-cost-grid",
    title: "最小消費で内核へ",
    concept: "2次元の動的計画法",
    briefing:
      "右か下にしか進めない送電路で各マスの消費を支払う。内核までの消費を最小にしよう。",
    objective:
      "minimumRouteCost(costs) が左上から右下まで右または下へ進む最小消費の合計を返す関数を実装しよう。始点・終点の費用も含みます。0以上の整数の長方形配列で空配列なら0です。",
    functionName: "minimumRouteCost",
    parameters: "costs",
    js: `if (costs.length === 0 || costs[0].length === 0) return 0;
const rows = costs.length, cols = costs[0].length;
const best = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
best[0][0] = costs[0][0];
for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    if (row > 0) best[row][col] = Math.min(best[row][col], best[row - 1][col] + costs[row][col]);
    if (col > 0) best[row][col] = Math.min(best[row][col], best[row][col - 1] + costs[row][col]);
  }
}
return best[rows - 1][cols - 1];`,
    py: `if not costs or not costs[0]:
    return 0
rows, cols = len(costs), len(costs[0])
best = [[float("inf")] * cols for _ in range(rows)]
best[0][0] = costs[0][0]
for row in range(rows):
    for col in range(cols):
        if row > 0:
            best[row][col] = min(best[row][col], best[row - 1][col] + costs[row][col])
        if col > 0:
            best[row][col] = min(best[row][col], best[row][col - 1] + costs[row][col])
return best[-1][-1]`,
    cases: [
      t(
        "安い経路を選ぶ",
        [
          [
            [1, 3, 1],
            [1, 5, 1],
            [4, 2, 1],
          ],
        ],
        7,
      ),
      t("1マスだけ", [[[8]]], 8),
      t("1行だけ", [[[2, 0, 3]]], 5),
      t(
        "全て無料",
        [
          [
            [0, 0],
            [0, 0],
          ],
        ],
        0,
      ),
      t("経路なし", [[]], 0),
    ],
    hints: [
      "あるマスへ来る直前の位置は上か左の2つだけです。",
      "そのマスまでの最小消費を表に記録して上・左の安い方を選ぼう。",
      "始点の費用を初期値にし配列外の候補は使わないようにします。",
    ],
    explanation:
      "上と左の最適な結果を再利用すると経路を全部列挙せずに最小値を求められます。始点・1行・1列の初期条件が重要です。",
  },
];

const finalProblems: Seed[] = [
  {
    id: "boss-power",
    title: "競合しない電力配分",
    concept: "非隣接選択の動的計画法と復元",
    briefing:
      "中心核の隣接した回路は同時に使えない。要求列から隣り合わない正の要求を選び全体の電力を最大化しよう。",
    objective:
      "distribute(requests) は整数配列から隣接しない正の要素を選び合計を最大にします。同じ長さの配列で選んだ位置だけ元の値の2倍を返し他は0にします。同点なら現在位置を選ばず前までの解を優先。配列長は0〜100です。",
    functionName: "distribute",
    parameters: "requests",
    js: `const best = Array(requests.length + 1).fill(0);
for (let i = 1; i <= requests.length; i++) {
  const take = Math.max(0, requests[i - 1]) + (i >= 2 ? best[i - 2] : 0);
  best[i] = Math.max(best[i - 1], take);
}
const allocation = Array(requests.length).fill(0);
let i = requests.length;
while (i > 0) {
  if (best[i] === best[i - 1]) i--;
  else {
    allocation[i - 1] = requests[i - 1] * 2;
    i -= 2;
  }
}
return allocation;`,
    py: `best = [0] * (len(requests) + 1)
for i in range(1, len(requests) + 1):
    take = max(0, requests[i - 1]) + (best[i - 2] if i >= 2 else 0)
    best[i] = max(best[i - 1], take)
allocation = [0] * len(requests)
i = len(requests)
while i > 0:
    if best[i] == best[i - 1]:
        i -= 1
    else:
        allocation[i - 1] = requests[i - 1] * 2
        i -= 2
return allocation`,
    starterJs: "return [];",
    starterPy: "return []",
    cases: [
      t("両端を組み合わせる", [[2, 3, 2]], [4, 0, 4]),
      t("中央の要求を選ぶ", [[2, 9, 2]], [0, 18, 0]),
      t("同点は現在を選ばない", [[4, 4]], [8, 0]),
      t("負と0は選ばない", [[-5, 0, -2]], [0, 0, 0]),
      t("要求なし", [[]], []),
      t("負の値の先で再開", [[3, -1, 4, 1, 5]], [6, 0, 8, 0, 10]),
    ],
    hints: [
      "今の要求を選ぶ場合は直前の要求を選べません。前までの最適値を再利用しよう。",
      "best[i]を先頭i個の最適合計とし「現在を飛ばす」と「2つ前の最適値に現在の正の要求を足す」を比較します。",
      "表の末尾から戻りbest[i]とbest[i-1]が等しければ飛ばします。違う場合だけ現在を採用して2位置戻ろう。",
    ],
    explanation:
      "最適な合計を計算するだけでは出力配列を作れません。保存した表を逆にたどって選択を復元します。同点時にスキップする規則で答えの配列も一意になります。",
  },
  {
    id: "boss-recovery",
    title: "通信の増加鎖を復元",
    concept: "合計と最長増加部分列",
    briefing:
      "配分された電力から総エネルギーと安定した増加鎖の長さを集計する。途中の値を飛ばしても順番は変えられません。",
    objective:
      "recover(allocation) が{energy, chain}を返す関数を実装しよう。energyは正の整数だけの合計、chainは正の値を順序通りに選んだ狭義増加部分列の最大長です。同値は増加に含めません。配列長は0〜100です。",
    functionName: "recover",
    parameters: "allocation",
    js: `const values = allocation.filter(value => value > 0);
const best = Array(values.length).fill(1);
let energy = 0, chain = 0;
for (let i = 0; i < values.length; i++) {
  energy += values[i];
  for (let j = 0; j < i; j++) {
    if (values[j] < values[i]) best[i] = Math.max(best[i], best[j] + 1);
  }
  chain = Math.max(chain, best[i]);
}
return { energy, chain };`,
    py: `values = [value for value in allocation if value > 0]
best = [1] * len(values)
energy = 0
chain = 0
for i in range(len(values)):
    energy += values[i]
    for j in range(i):
        if values[j] < values[i]:
            best[i] = max(best[i], best[j] + 1)
    chain = max(chain, best[i])
return {"energy": energy, "chain": chain}`,
    starterJs: "return { energy: 0, chain: 0 };",
    starterPy: 'return {"energy": 0, "chain": 0}',
    cases: [
      t("等しい値は鎖を伸ばさない", [[4, 4, 6, 2, 8]], {
        energy: 24,
        chain: 3,
      }),
      t("順番が減少する", [[9, 6, 3]], { energy: 18, chain: 1 }),
      t("途中を飛ばして増加", [[1, 3, 2, 4]], { energy: 10, chain: 3 }),
      t("ノイズと0を除外", [[-4, 0, 2, 0, 5]], { energy: 7, chain: 2 }),
      t("通信なし", [[]], { energy: 0, chain: 0 }),
    ],
    hints: [
      "総量と鎖の長さは違う情報です。正の値だけを対象に両方を求めよう。",
      "best[i]をiで終わる増加部分列の最大長としてそれより前の小さい値から伸ばします。",
      "values[j] < values[i] のときbest[j] + 1を候補にします。空配列ではchainを0のまま返そう。",
    ],
    explanation:
      "最長増加部分列は連続した区間とは異なります。前の値を飛ばせますが並べ替えることはできません。厳密な小なり比較で同じ値を2回の増加として数えないようにします。",
  },
  {
    id: "boss-access",
    title: "核への接続経路を認証",
    concept: "条件判定と有向グラフ探索",
    briefing:
      "十分な電力と増加鎖があっても認証された通信経路がなければ中心核を起動できない。循環するネットワークから到達可能性を調べよう。",
    objective:
      "authorize(report, policy) はreport.energy ≥ policy.minEnergy、report.chain ≥ policy.minChain、policy.startからpolicy.targetへの有向経路がある場合だけ真を返します。policy.edgesは整数ペア[from,to]の配列。始点と終点が同じなら経路あり。循環に対応しよう。",
    functionName: "authorize",
    parameters: "report, policy",
    js: `if (report.energy < policy.minEnergy || report.chain < policy.minChain) return false;
const queue = [policy.start];
const seen = new Set(queue);
for (let head = 0; head < queue.length; head++) {
  const node = queue[head];
  if (node === policy.target) return true;
  for (const [from, to] of policy.edges) {
    if (from === node && !seen.has(to)) {
      seen.add(to);
      queue.push(to);
    }
  }
}
return false;`,
    py: `if report["energy"] < policy["minEnergy"] or report["chain"] < policy["minChain"]:
    return False
queue = [policy["start"]]
seen = set(queue)
head = 0
while head < len(queue):
    node = queue[head]
    head += 1
    if node == policy["target"]:
        return True
    for source, target in policy["edges"]:
        if source == node and target not in seen:
            seen.add(target)
            queue.append(target)
return False`,
    starterJs: "return false;",
    starterPy: "return False",
    cases: [
      t(
        "基準ちょうどで中継先へ接続",
        [
          { energy: 20, chain: 2 },
          {
            edges: [
              [0, 1],
              [1, 2],
            ],
            start: 0,
            target: 2,
            minEnergy: 20,
            minChain: 2,
          },
        ],
        true,
      ),
      t(
        "エネルギー不足",
        [
          { energy: 19, chain: 3 },
          { edges: [[0, 1]], start: 0, target: 1, minEnergy: 20, minChain: 2 },
        ],
        false,
      ),
      t(
        "増加鎖が不足",
        [
          { energy: 100, chain: 1 },
          { edges: [[0, 1]], start: 0, target: 1, minEnergy: 20, minChain: 2 },
        ],
        false,
      ),
      t(
        "逆向きの辺では進めない",
        [
          { energy: 20, chain: 2 },
          { edges: [[1, 0]], start: 0, target: 1, minEnergy: 20, minChain: 2 },
        ],
        false,
      ),
      t(
        "循環の先に終点",
        [
          { energy: 20, chain: 2 },
          {
            edges: [
              [0, 1],
              [1, 0],
              [1, 2],
            ],
            start: 0,
            target: 2,
            minEnergy: 20,
            minChain: 2,
          },
        ],
        true,
      ),
      t(
        "同じ地点なら辺は不要",
        [
          { energy: 0, chain: 0 },
          { edges: [], start: 3, target: 3, minEnergy: 0, minChain: 0 },
        ],
        true,
      ),
    ],
    hints: [
      "電力と増加鎖を先に判定してから通信経路を探索できます。",
      "始点から進める行き先を待ち行列に追加し訪問済みの地点を記録しよう。",
      "辺はfromからtoへの一方向です。訪問済みの集合で循環を止め、探索中にtargetへ着いたら真を返します。",
    ],
    explanation:
      "個々の条件が成立しても組み合わせ全体が成立するとは限りません。閾値の確認と有向グラフの到達判定を分けることで必要な条件をすべて確認できます。",
  },
];

const intermediate: Seed[] = [
  {
    id: "mid-double-array",
    title: "増幅リレーの列",
    concept: "配列の変換",
    briefing:
      "中層のリレーが受け取った電力の列をそのまま送っている。各値を2倍にして同じ順序で返そう。",
    objective:
      "doubleSignals(values) は整数の配列 values の各要素を2倍にした新しい配列を返す。空配列なら空配列を返す。",
    functionName: "doubleSignals",
    parameters: "values",
    js: `return values.map(value => value * 2);`,
    py: `return [value * 2 for value in values]`,
    cases: [
      { label: "3つの信号を増幅", input: [[1, 3, 5]], expected: [2, 6, 10] },
      { label: "0の信号も残す", input: [[0, 2]], expected: [0, 4] },
      {
        label: "負の信号にも同じ規則",
        input: [[-2, 4, -1]],
        expected: [-4, 8, -2],
      },
      { label: "信号がまだない", input: [[]], expected: [] },
    ],
    hints: [
      "配列全体ではなく1つずつの要素を変換する。",
      "要素を取り出して2倍にし結果の配列へ追加する。",
      "空の結果配列を用意しループで value * 2 を追加してもよい。最後に結果の配列を返そう。",
    ],
    explanation:
      "各要素に同じ変換を適用する処理をマップと呼ぶ。要素数と順序を保ったまま新しい値の列を作れる。",
  },
  {
    id: "mid-threshold-count",
    title: "警戒値を超えた端末",
    concept: "条件付きの個数集計",
    briefing:
      "温度の一覧から警戒値を超えた端末の数を調べる。警戒値ちょうどの端末はまだ数えない。",
    objective:
      "countHot(values, limit) は整数の配列 values のうち limit より大きい値の個数を返す。",
    functionName: "countHot",
    parameters: "values, limit",
    js: `let count = 0;
for (const value of values) {
  if (value > limit) count++;
}
return count;`,
    py: `count = 0
for value in values:
    if value > limit:
        count += 1
return count`,
    cases: [
      { label: "警戒値を超えた2台", input: [[3, 7, 10, 4], 5], expected: 2 },
      { label: "警戒値ちょうどは除外", input: [[5, 5, 6], 5], expected: 1 },
      { label: "負の値とも比較する", input: [[-3, -1, 0], -2], expected: 2 },
      { label: "一覧が空なら0台", input: [[], 4], expected: 0 },
    ],
    hints: [
      "条件に合う値を見つけた回数を数える。",
      "個数を0で用意し value > limit の場合だけ1増やす。",
      "ループが終わるまで個数を持ち続けよう。>= では警戒値ちょうども数えてしまう。",
    ],
    explanation:
      "比較とループを組み合わせると条件を満たす要素だけを数えられる。境界の値を含めるかどうかを明示することが大切。",
  },
  {
    id: "mid-maximum",
    title: "最強の予備電源",
    concept: "最大値の探索",
    briefing:
      "予備電源の出力一覧から最も大きい出力を探す。今回はすべて0以上の整数で電源がない場合は0とする。",
    objective:
      "strongestPower(values) は0以上の整数の配列 values の最大値を返す。空配列なら0を返す。",
    functionName: "strongestPower",
    parameters: "values",
    js: `let best = 0;
for (const value of values) {
  if (value > best) best = value;
}
return best;`,
    py: `best = 0
for value in values:
    if value > best:
        best = value
return best`,
    cases: [
      { label: "途中の大きな値を探す", input: [[4, 12, 8]], expected: 12 },
      { label: "同じ出力が並ぶ", input: [[5, 5, 5]], expected: 5 },
      { label: "0だけの電源", input: [[0, 0]], expected: 0 },
      { label: "電源が見つからない", input: [[]], expected: 0 },
    ],
    hints: [
      "これまで見つけた最大値を覚えておく。",
      "入力は0以上なので最初の候補を0にできる。",
      "各値が候補より大きいときだけ候補を置き換えよう。最後に候補を返す。",
    ],
    explanation:
      "最大値の探索では候補を1つだけ保持すればよい。入力の範囲が分かっていると初期値や空入力の扱いを安全に決められる。",
  },
  {
    id: "mid-reverse-text",
    title: "反転して届いた通信",
    concept: "文字列の走査",
    briefing:
      "通信の文字が逆順になってしまった。ASCII文字だけでできた文字列を後ろから読み直そう。",
    objective:
      "reverseMessage(text) はASCII文字列 text を逆順にした文字列を返す。空文字列はそのまま返す。",
    functionName: "reverseMessage",
    parameters: "text",
    js: `let result = "";
for (let index = text.length - 1; index >= 0; index--) {
  result += text[index];
}
return result;`,
    py: `result = ""
for index in range(len(text) - 1, -1, -1):
    result += text[index]
return result`,
    cases: [
      { label: "通信の順序を戻す", input: ["OLLEH"], expected: "HELLO" },
      { label: "数字と記号も文字として扱う", input: ["A1!"], expected: "!1A" },
      { label: "1文字なら変わらない", input: ["X"], expected: "X" },
      { label: "空の通信", input: [""], expected: "" },
    ],
    hints: [
      "最後の文字から最初の文字へ向かって読む。",
      "文字列の最後の位置は長さから1を引いた位置。",
      "位置を1ずつ減らすループを使い取り出した文字を結果へ追加しよう。",
    ],
    explanation:
      "文字列も位置を指定して順番に読める。逆方向へ走査するときは開始位置と終了条件を対応させよう。",
  },
  {
    id: "mid-join-labels",
    title: "ルート名の連結",
    concept: "文字列の結合と区切り",
    briefing:
      "通過した拠点名を1本のルート表示にまとめる。区切り文字は拠点名の間だけに置こう。",
    objective:
      "joinRoute(labels, separator) はASCII文字列の配列 labels を文字列 separator で区切って結合する。空配列なら空文字列を返す。",
    functionName: "joinRoute",
    parameters: "labels, separator",
    js: `let result = "";
for (let index = 0; index < labels.length; index++) {
  if (index > 0) result += separator;
  result += labels[index];
}
return result;`,
    py: `result = ""
for index in range(len(labels)):
    if index > 0:
        result += separator
    result += labels[index]
return result`,
    cases: [
      {
        label: "拠点名の間に矢印",
        input: [["HOME", "CITY", "CORE"], "->"],
        expected: "HOME->CITY->CORE",
      },
      {
        label: "1拠点には区切りがない",
        input: [["NODE"], "/"],
        expected: "NODE",
      },
      {
        label: "空の区切りでつなぐ",
        input: [["A", "B", "C"], ""],
        expected: "ABC",
      },
      { label: "まだ拠点がない", input: [[], ","], expected: "" },
    ],
    hints: [
      "区切りを毎回追加すると先頭か末尾に余分な区切りができる。",
      "最初の要素以外を追加するときだけ先に区切りを追加できる。",
      "位置が0より大きい場合だけ separator を足してから labels[index] を追加しよう。",
    ],
    explanation:
      "結合処理では要素間の境界を扱う。要素を追加する前に最初の要素かを判定すると余分な区切りを防げる。",
  },
  {
    id: "mid-even-sum",
    title: "偶数チャンネルの合計",
    concept: "剰余と条件付き集計",
    briefing:
      "偶数チャンネルにある値だけが現在の中継器と互換性を持つ。2で割り切れる整数だけを集計しよう。",
    objective:
      "sumEven(values) は整数の配列 values に含まれる偶数の合計を返す。負の偶数と0も対象にする。",
    functionName: "sumEven",
    parameters: "values",
    js: `let total = 0;
for (const value of values) {
  if (value % 2 === 0) total += value;
}
return total;`,
    py: `total = 0
for value in values:
    if value % 2 == 0:
        total += value
return total`,
    cases: [
      { label: "偶数だけを足す", input: [[1, 2, 3, 4, 6]], expected: 12 },
      { label: "負の偶数も足す", input: [[-4, -3, 2]], expected: -2 },
      { label: "奇数だけなら0", input: [[1, 5, 9]], expected: 0 },
      { label: "空の一覧", input: [[]], expected: 0 },
    ],
    hints: [
      "偶数かどうかは2で割った余りで判断できる。",
      "value % 2 が0になる要素だけを合計へ足す。",
      "合計を0で用意して最後までループしよう。負の値も符号を変えずに加える。",
    ],
    explanation:
      "剰余演算は周期的な分類に使える。条件に合う値を選ぶ処理と合計する処理を同じループの中へ組み合わせた。",
  },
  {
    id: "mid-first-positive",
    title: "最初に使える信号",
    concept: "探索と早期リターン",
    briefing:
      "受信順に並んだ値から最初の正の信号だけを使う。後ろにもっと大きい信号があっても最初の信号を優先する。",
    objective:
      "firstPositive(values) は整数の配列 values を先頭から探して最初の0より大きい値を返す。見つからなければ0を返す。",
    functionName: "firstPositive",
    parameters: "values",
    js: `for (const value of values) {
  if (value > 0) return value;
}
return 0;`,
    py: `for value in values:
    if value > 0:
        return value
return 0`,
    cases: [
      { label: "最初の正の値で止める", input: [[-2, 0, 4, 9]], expected: 4 },
      { label: "先頭から使える", input: [[3, 2, 1]], expected: 3 },
      { label: "正の値がない", input: [[-5, 0, -1]], expected: 0 },
      { label: "まだ何も届かない", input: [[]], expected: 0 },
    ],
    hints: [
      "最大値ではなく受信順で最初の条件一致を探す。",
      "条件に合う値を見つけたらその場で返してよい。",
      "ループの中で value > 0 を判定し一致したら return value。ループの外で0を返そう。",
    ],
    explanation:
      "答えが見つかった時点で関数から返ると余計な探索を避けられる。見つからなかった場合の返り値も用意しておこう。",
  },
  {
    id: "mid-clamp-array",
    title: "逆流ノイズの除去",
    concept: "条件分岐による配列変換",
    briefing:
      "負の電力値は逆流ノイズとして0へ置き換える。正の電力や0の位置と要素数は変えない。",
    objective:
      "clampSignals(values) は整数の配列 values の負の値を0へ置き換えた新しい配列を返す。0以上の値はそのまま残す。",
    functionName: "clampSignals",
    parameters: "values",
    js: `const result = [];
for (const value of values) {
  result.push(value < 0 ? 0 : value);
}
return result;`,
    py: `result = []
for value in values:
    result.append(0 if value < 0 else value)
return result`,
    cases: [
      {
        label: "負の位置だけ0にする",
        input: [[4, -3, 0, 7]],
        expected: [4, 0, 0, 7],
      },
      { label: "すべて逆流", input: [[-1, -8]], expected: [0, 0] },
      { label: "正常な値は変えない", input: [[0, 2, 5]], expected: [0, 2, 5] },
      { label: "空の入力", input: [[]], expected: [] },
    ],
    hints: [
      "要素を取り除く処理ではなく値を置き換える処理。",
      "各値を見て負なら0を結果へ追加しそれ以外は元の値を追加する。",
      "どちらの分岐でも必ず1つ要素を追加すると位置と要素数を保てる。",
    ],
    explanation:
      "フィルターは要素を減らすが変換は要素ごとの値を変更する。求められる結果の形を先に確認すると処理を選びやすい。",
  },
  {
    id: "mid-running-total",
    title: "補給の累積メーター",
    concept: "累積和",
    briefing:
      "各時刻までに補給された電力の累計を表示する。途中で電力が消費された場合は負の補給として扱おう。",
    objective:
      "runningTotals(values) は整数の配列 values について先頭から各位置までの合計を並べた配列を返す。",
    functionName: "runningTotals",
    parameters: "values",
    js: `const result = [];
let total = 0;
for (const value of values) {
  total += value;
  result.push(total);
}
return result;`,
    py: `result = []
total = 0
for value in values:
    total += value
    result.append(total)
return result`,
    cases: [
      { label: "補給が積み上がる", input: [[2, 3, 4]], expected: [2, 5, 9] },
      { label: "途中で消費する", input: [[5, -2, 4]], expected: [5, 3, 7] },
      { label: "0の補給", input: [[0, 0, 1]], expected: [0, 0, 1] },
      { label: "補給記録なし", input: [[]], expected: [] },
    ],
    hints: [
      "合計を毎回0から計算し直す必要はない。",
      "前の位置までの合計に次の値を足せば次の累計になる。",
      "ループで total に値を加えた直後の total を結果配列へ追加しよう。",
    ],
    explanation:
      "途中までの結果を次の計算へ使うと1回の走査で累計を作れる。累積和は区間の合計や統計処理の基礎になる。",
  },
  {
    id: "mid-unique-order",
    title: "重複した配送先",
    concept: "既出の値の管理",
    briefing:
      "同じ配送先へ何度も送らないよう重複を除く。ただし最初に現れた順番は守らなければならない。",
    objective:
      "uniqueDestinations(values) は整数の配列 values から重複を取り除き最初に現れた順で返す。",
    functionName: "uniqueDestinations",
    parameters: "values",
    js: `const result = [];
const seen = new Set();
for (const value of values) {
  if (!seen.has(value)) {
    seen.add(value);
    result.push(value);
  }
}
return result;`,
    py: `result = []
seen = set()
for value in values:
    if value not in seen:
        seen.add(value)
        result.append(value)
return result`,
    cases: [
      {
        label: "最初の登場順を保つ",
        input: [[3, 1, 3, 2, 1]],
        expected: [3, 1, 2],
      },
      {
        label: "0と負の配送先",
        input: [[0, -1, 0, -1, 2]],
        expected: [0, -1, 2],
      },
      { label: "1種類だけ", input: [[7, 7, 7]], expected: [7] },
      { label: "配送先なし", input: [[]], expected: [] },
    ],
    hints: [
      "今まで見た値かどうかを覚えておく。",
      "まだ見ていない値だけを結果へ追加し同時に既出として記録する。",
      "集合を使うならJavaScriptの has と add、Pythonの in と add が役に立つ。",
    ],
    hintsPy: [
      "結果を入れる空のリストを作り、配送先を先頭から1つずつ見よう。結果に同じ値を2回入れないことが目標です。",
      "value not in result は「value が結果のリストにまだ入っていないか」を調べます。入っていないときだけ、append() で追加しよう。",
      "result = [] を用意し、for で取り出した値が value not in result のときだけ result.append(value) を実行します。最後に return result。リストだけでも解けます。",
    ],
    explanation:
      "順序を保つ結果配列と既出かを判定する集合を分けると重複除去の意図が明確になる。",
    explanationPy:
      "先頭から順に調べ、結果のリストにまだない値だけを追加すると、最初に出てきた順番を保てます。例：[4, 7, 4] なら4と7を追加し、2回目の4は追加しないので [4, 7] です。参考の解答は、見た値を覚える集合 seen と、順番を残すリスト result を分ける方法です。",
  },
  {
    id: "mid-rotate-left",
    title: "巡回キューの再配置",
    concept: "配列の回転と剰余",
    briefing:
      "巡回キューの先頭からk個を末尾へ回す。kがキューの長さを超えても同じ巡回を続けよう。",
    objective:
      "rotateQueue(values, k) は整数の配列 values を左にk回回転した配列を返す。kは0以上の整数。空配列なら空配列を返す。",
    objectivePy:
      "rotateQueue(values, k) で、先頭の値を最後に移す操作をk回行ったリストを返そう。例：[1, 2, 3, 4] を2回 → [3, 4, 1, 2]。valuesは整数のリスト、kは0以上の整数です。0回なら元の並び、空なら [] を返します。",
    functionName: "rotateQueue",
    parameters: "values, k",
    js: `if (values.length === 0) return [];
const offset = k % values.length;
return values.slice(offset).concat(values.slice(0, offset));`,
    py: `if len(values) == 0:
    return []
offset = k % len(values)
return values[offset:] + values[:offset]`,
    cases: [
      {
        label: "先頭の2個を末尾へ",
        input: [[1, 2, 3, 4], 2],
        expected: [3, 4, 1, 2],
      },
      { label: "長さを超えて巡回", input: [[1, 2, 3], 4], expected: [2, 3, 1] },
      { label: "回転しない", input: [[5, 6], 0], expected: [5, 6] },
      { label: "空のキューは割り算しない", input: [[], 5], expected: [] },
      { label: "ちょうど1周", input: [[8, 9], 2], expected: [8, 9] },
    ],
    hints: [
      "長さと同じ回数だけ回すと元へ戻る。",
      "実際に必要な移動回数は k を長さで割った余りになる。",
      "空配列を先に処理しよう。余りの位置から末尾までと先頭から余りの位置までを結合できる。",
    ],
    explanation:
      "剰余を使うと大量の巡回操作を1つの位置へ置き換えられる。長さ0のときに割らない順序も大切。",
  },
  {
    id: "mid-palindrome",
    title: "対称通信の検査",
    concept: "文字列の正規化と比較",
    briefing:
      "正しく同期した通信語は前から読んでも後ろから読んでも同じになる。大文字と小文字の違いは無視して検査しよう。",
    objective:
      "isMirrorWord(text) はASCII英字だけからなる文字列 text を大文字小文字を無視して回文ならtrue／Trueを返す。空文字列も回文とする。",
    functionName: "isMirrorWord",
    parameters: "text",
    js: `const normalized = text.toLowerCase();
let left = 0;
let right = normalized.length - 1;
while (left < right) {
  if (normalized[left] !== normalized[right]) return false;
  left++;
  right--;
}
return true;`,
    py: `normalized = text.lower()
left = 0
right = len(normalized) - 1
while left < right:
    if normalized[left] != normalized[right]:
        return False
    left += 1
    right -= 1
return True`,
    cases: [
      { label: "大文字と小文字をそろえる", input: ["RaceCar"], expected: true },
      { label: "対称でない語", input: ["relay"], expected: false },
      { label: "偶数の文字数", input: ["AbBa"], expected: true },
      { label: "1文字", input: ["X"], expected: true },
      { label: "空の語", input: [""], expected: true },
    ],
    hints: [
      "比較の前に大文字と小文字をそろえる。",
      "文字列の両端の文字が同じか比べてから両方の位置を中央へ進める。",
      "左右の文字が違う瞬間にfalseを返せる。位置が交差するまで違いがなければtrue。",
    ],
    hintsPy: [
      '比較の前に text.lower() で英字をすべて小文字にそろえよう。例："RaceCar" は "racecar" になります。',
      "normalized = text.lower() として結果を保存し、その文字列の両端から文字を比べよう。元の text はそのままなので、小文字にした結果を使います。",
      "左右の文字が違えば False を返せます。同じなら両方の位置を中央へ進め、最後まで違いがなければ True を返そう。",
    ],
    explanation:
      "入力を同じ表記へ正規化すると条件を単純化できる。両端から中央へ進む2つの位置を使う方法は配列の処理にも応用できる。",
  },
  {
    id: "mid-longest-word",
    title: "最長のルート識別子",
    concept: "条件付きの候補更新",
    briefing:
      "ルート識別子の一覧から最も長い識別子を選ぶ。同じ長さなら最初に届いた識別子を残す。",
    objective:
      "longestLabel(words) はASCII文字列の配列 words のうち最も長い文字列を返す。同じ長さなら先の要素を返し空配列なら空文字列を返す。",
    functionName: "longestLabel",
    parameters: "words",
    js: `let best = "";
for (const word of words) {
  if (word.length > best.length) best = word;
}
return best;`,
    py: `best = ""
for word in words:
    if len(word) > len(best):
        best = word
return best`,
    cases: [
      {
        label: "最長の識別子を探す",
        input: [["A", "RELAY", "CORE"]],
        expected: "RELAY",
      },
      {
        label: "同じ長さなら先を残す",
        input: [["HOME", "CITY", "NODE"]],
        expected: "HOME",
      },
      {
        label: "空文字列も要素として扱う",
        input: [["", "X", ""]],
        expected: "X",
      },
      { label: "識別子なし", input: [[]], expected: "" },
    ],
    hints: [
      "最大値の探索と似ているが比較するのは文字列の長さ。",
      "候補より厳密に長い場合だけ置き換えると同じ長さの先着を残せる。",
      ">= では後から届いた同じ長さの語へ置き換わる。> を使って長さを比べよう。",
    ],
    explanation:
      "候補の更新条件は同順位の扱いも決める。厳密な大小比較を使うことで入力順を利用した安定した選択ができる。",
  },
];

const advanced: Seed[] = [
  {
    id: "adv-linear-search",
    title: "最初の救難信号を探せ",
    concept: "線形探索と早期return",
    briefing:
      "通信列から指定された信号が最初に現れる位置を探します。見つかった後にさらに探す必要はありません。",
    objective:
      "findSignal(values, target) は整数配列 values で target が最初に現れる0始まりの位置を返します。存在しなければ -1 を返してください。",
    functionName: "findSignal",
    parameters: "values, target",
    js: `for (let i = 0; i < values.length; i++) {
  if (values[i] === target) return i;
}
return -1;`,
    py: `for i in range(len(values)):
    if values[i] == target:
        return i
return -1`,
    cases: [
      { label: "途中の救難信号", input: [[3, 8, 2, 9], 2], expected: 2 },
      { label: "重複は最初の位置", input: [[7, 4, 7, 7], 7], expected: 0 },
      { label: "信号が見つからない", input: [[1, 2], 5], expected: -1 },
      { label: "空の通信列", input: [[], 0], expected: -1 },
    ],
    hints: [
      "値と一緒にその位置も追跡しよう。",
      "0から配列の長さ未満まで位置を増やし target と比較します。",
      "一致した位置をその場で返します。ループを抜けるまで一致しなければ -1 を返そう。",
    ],
    explanation:
      "先頭から一度ずつ調べる探索です。最初の一致で終了すれば重複があっても最初の位置を返せます。",
  },
  {
    id: "adv-binary-search",
    title: "整列したアーカイブを開く",
    concept: "二分探索と境界更新",
    briefing:
      "膨大な番号を持つアーカイブでは調べる範囲を半分ずつ狭めます。番号は小さい順で重複しません。",
    objective:
      "archiveIndex(values, target) は重複のない昇順の整数配列から target の0始まりの位置を二分探索で返します。存在しなければ -1。空配列も扱ってください。",
    objectivePy:
      "archiveIndex(values, target) は重複のない昇順の整数配列から target の0始まりの位置を二分探索で返します。存在しなければ -1。空配列も扱ってください。\n\n二分探索は、並んだデータの中央を調べ、中央の値が探す値より小さければ右半分、大きければ左半分へと、探す範囲を半分ずつにしぼる方法です。詳しくは「二分探索」で調べてみよう。",
    functionName: "archiveIndex",
    parameters: "values, target",
    js: `let left = 0;
let right = values.length - 1;
while (left <= right) {
  const middle = Math.floor((left + right) / 2);
  if (values[middle] === target) return middle;
  if (values[middle] < target) left = middle + 1;
  else right = middle - 1;
}
return -1;`,
    py: `left = 0
right = len(values) - 1
while left <= right:
    middle = (left + right) // 2
    if values[middle] == target:
        return middle
    if values[middle] < target:
        left = middle + 1
    else:
        right = middle - 1
return -1`,
    cases: [
      { label: "中央付近の番号", input: [[2, 5, 8, 11, 16], 11], expected: 3 },
      { label: "先頭の境界", input: [[-5, 0, 3], -5], expected: 0 },
      { label: "末尾の境界", input: [[1, 4, 9], 9], expected: 2 },
      { label: "番号の間にも存在しない", input: [[1, 4, 9], 5], expected: -1 },
      { label: "空のアーカイブ", input: [[], 1], expected: -1 },
    ],
    hints: [
      "いま探している範囲の左右の位置を持とう。",
      "中央の値が小さすぎたら中央より右だけを残します。大きすぎたら左だけを残します。",
      "中央を再び調べないよう left は middle + 1 または right は middle - 1 に更新しよう。",
    ],
    explanation:
      "整列済みという条件を使うと探索範囲を毎回半分にできます。左右が逆転したときは候補が残っていません。",
  },
  {
    id: "adv-frequencies",
    title: "通信タグの分布を調べる",
    concept: "辞書による頻度集計",
    briefing:
      "混雑の原因を調べるため通信タグごとの出現回数を数えます。同じタグが離れて現れても同じ項目に加算します。",
    objective:
      "countTags(tags) は文字列の配列を受け取りタグをキーに出現回数を値に持つ辞書を返します。入力が空なら空の辞書を返してください。",
    functionName: "countTags",
    parameters: "tags",
    js: `const counts = Object.create(null);
for (const tag of tags) counts[tag] = (counts[tag] ?? 0) + 1;
return counts;`,
    py: `counts = {}
for tag in tags:
    counts[tag] = counts.get(tag, 0) + 1
return counts`,
    cases: [
      {
        label: "離れた同じタグも合算",
        input: [["blue", "red", "blue", "green", "red", "blue"]],
        expected: { blue: 3, red: 2, green: 1 },
      },
      { label: "一種類だけ", input: [["core", "core"]], expected: { core: 2 } },
      {
        label: "空のタグも文字列として数える",
        input: [["", "x", ""]],
        expected: { "": 2, x: 1 },
      },
      { label: "通信がない", input: [[]], expected: {} },
    ],
    hints: [
      "タグを配列の位置で探す代わりにタグ自体を辞書のキーにしよう。",
      "まだ登場していないキーの回数は0として扱います。",
      "各タグについて現在の回数を読み出し1を足して同じキーへ保存します。",
    ],
    explanation:
      "辞書を使うと値ごとの集計結果を直接参照できます。初登場のキーを0から始める処理が集計の基本です。",
  },
  {
    id: "adv-partition",
    title: "偶数系と奇数系の配線",
    concept: "分類と順序の維持",
    briefing:
      "配線番号を偶数と奇数の2系統に分けます。各系統では受け取った順番を保つ必要があります。",
    objective:
      "splitLines(values) は整数配列を {even: 偶数の配列, odd: 奇数の配列} に分類して返します。負の数と0にも対応し各配列の入力順を保ってください。",
    functionName: "splitLines",
    parameters: "values",
    js: `const result = { even: [], odd: [] };
for (const value of values) {
  if (value % 2 === 0) result.even.push(value);
  else result.odd.push(value);
}
return result;`,
    py: `result = {"even": [], "odd": []}
for value in values:
    if value % 2 == 0:
        result["even"].append(value)
    else:
        result["odd"].append(value)
return result`,
    cases: [
      {
        label: "二つの系統へ分配",
        input: [[3, 2, 5, 4, 8, 7]],
        expected: { even: [2, 4, 8], odd: [3, 5, 7] },
      },
      {
        label: "負数とゼロ",
        input: [[-3, 0, -2, -1]],
        expected: { even: [0, -2], odd: [-3, -1] },
      },
      {
        label: "偶数だけ",
        input: [[2, 2]],
        expected: { even: [2, 2], odd: [] },
      },
      { label: "配線がない", input: [[]], expected: { even: [], odd: [] } },
    ],
    hints: [
      "結果の配列を偶数用と奇数用の二つ用意しよう。",
      "2で割った余りが0なら偶数です。0以外なら奇数です。",
      "入力を先頭から調べて分類先の末尾へ追加すると順番を保てます。",
    ],
    explanation:
      "一つの入力列を条件に従って複数の出力へ分ける処理です。先頭から追加することで分類と順序の維持を同時に行えます。",
  },
  {
    id: "adv-unique-sort",
    title: "重複した周波数を整理する",
    concept: "集合と数値ソート",
    briefing:
      "重複する周波数を一つにまとめて小さい順へ並べます。文字列の並び順と数値の並び順は異なります。",
    objective:
      "uniqueChannels(values) は整数配列から重複を取り除き数値の昇順に並べた新しい配列を返します。空配列も扱ってください。",
    functionName: "uniqueChannels",
    parameters: "values",
    js: `return [...new Set(values)].sort((a, b) => a - b);`,
    py: `return sorted(set(values))`,
    cases: [
      {
        label: "重複を除いて整列",
        input: [[4, 2, 4, 10, 2, 1]],
        expected: [1, 2, 4, 10],
      },
      {
        label: "数値として並べる",
        input: [[20, 3, 11, 2]],
        expected: [2, 3, 11, 20],
      },
      {
        label: "負数とゼロも整列",
        input: [[0, -2, -2, 3, 0]],
        expected: [-2, 0, 3],
      },
      { label: "周波数がない", input: [[]], expected: [] },
    ],
    hints: [
      "集合は同じ値を一つだけ保持します。",
      "重複を除く処理と並べ替える処理を順に行いましょう。",
      "JavaScriptでは sort に差を返す比較関数を渡すと数値順になります。Pythonは sorted で昇順にできます。",
    ],
    explanation:
      "集合で値の重複を除きソートで順序を決めます。役割が違う二つの操作を組み合わせると要件を明確に表現できます。",
  },
  {
    id: "adv-rle",
    title: "連続信号を圧縮する",
    concept: "連続区間の集計",
    briefing:
      "同じ文字が連続する区間を文字と個数の組に圧縮します。離れた同じ文字は別の区間です。",
    objective:
      "packSignal(text) はASCII文字列を [[文字, 連続個数], ...] の配列にして返します。空文字列は空配列にしてください。",
    functionName: "packSignal",
    parameters: "text",
    js: `const groups = [];
for (const character of text) {
  const last = groups[groups.length - 1];
  if (last && last[0] === character) last[1] += 1;
  else groups.push([character, 1]);
}
return groups;`,
    py: `groups = []
for character in text:
    if groups and groups[-1][0] == character:
        groups[-1][1] += 1
    else:
        groups.append([character, 1])
return groups`,
    cases: [
      {
        label: "連続区間を圧縮",
        input: ["aaabbc"],
        expected: [
          ["a", 3],
          ["b", 2],
          ["c", 1],
        ],
      },
      {
        label: "離れた同じ文字は別区間",
        input: ["aba"],
        expected: [
          ["a", 1],
          ["b", 1],
          ["a", 1],
        ],
      },
      { label: "一文字の通信", input: ["Z"], expected: [["Z", 1]] },
      { label: "空の通信", input: [""], expected: [] },
    ],
    hints: [
      "直前に作った区間と今回の文字が同じかを調べよう。",
      "同じ文字なら最後の組の個数を増やし違う文字なら新しい組を追加します。",
      "まだ結果が空のときも新しい組を作る必要があります。最後の組を参照する前に空かを確認しよう。",
    ],
    explanation:
      "前の状態を覚えて次の入力と比較する処理です。全体の出現回数ではなく連続する区間を数える点が頻度集計との違いです。",
  },
  {
    id: "adv-merge",
    title: "二つの時刻ログを合流させる",
    concept: "二つの位置を使うマージ",
    briefing:
      "別々に昇順で届くログを一つの昇順ログへ合流させます。同じ時刻の記録もすべて残します。",
    objective:
      "mergeLogs(left, right) は昇順の整数配列を二つ受け取り昇順で合流した新しい配列を返します。重複を残し元の配列は変更しないでください。",
    functionName: "mergeLogs",
    parameters: "left, right",
    js: `const result = [];
let i = 0;
let j = 0;
while (i < left.length && j < right.length) {
  if (left[i] <= right[j]) result.push(left[i++]);
  else result.push(right[j++]);
}
return result.concat(left.slice(i), right.slice(j));`,
    py: `result = []
i = 0
j = 0
while i < len(left) and j < len(right):
    if left[i] <= right[j]:
        result.append(left[i])
        i += 1
    else:
        result.append(right[j])
        j += 1
return result + left[i:] + right[j:]`,
    cases: [
      {
        label: "二つのログが交互に入る",
        input: [
          [1, 4, 7],
          [2, 3, 8],
        ],
        expected: [1, 2, 3, 4, 7, 8],
      },
      {
        label: "同じ時刻をすべて残す",
        input: [
          [1, 2, 2],
          [2, 3],
        ],
        expected: [1, 2, 2, 2, 3],
      },
      { label: "片側だけのログ", input: [[], [-3, 0]], expected: [-3, 0] },
      { label: "両方空", input: [[], []], expected: [] },
    ],
    hints: [
      "それぞれの配列で次に読む位置を別々に持とう。",
      "両側の先頭候補を比べて小さい方を結果へ移しその側の位置だけを進めます。",
      "片側が終わったらもう片側の残りはそのまま昇順です。末尾へ追加しよう。",
    ],
    explanation:
      "すでに整列済みの二つの列は毎回小さい先頭を選ぶだけで合流できます。二つの位置を独立に進める手法はさまざまな列の処理に使えます。",
  },
  {
    id: "adv-transpose",
    title: "センサー格子の向きを変える",
    concept: "二重ループと行列の転置",
    briefing:
      "行ごとに保存されたセンサー値を列ごとに読み直します。正方形とは限らない格子にも対応してください。",
    objective:
      "transposeGrid(grid) は各行が同じ長さの数値の二次元配列を転置して返します。grid が空または列数0なら空配列を返します。",
    functionName: "transposeGrid",
    parameters: "grid",
    js: `if (grid.length === 0 || grid[0].length === 0) return [];
const result = [];
for (let column = 0; column < grid[0].length; column++) {
  const row = [];
  for (let index = 0; index < grid.length; index++) row.push(grid[index][column]);
  result.push(row);
}
return result;`,
    py: `if not grid or not grid[0]:
    return []
result = []
for column in range(len(grid[0])):
    row = []
    for index in range(len(grid)):
        row.append(grid[index][column])
    result.append(row)
return result`,
    cases: [
      {
        label: "長方形の格子",
        input: [
          [
            [1, 2, 3],
            [4, 5, 6],
          ],
        ],
        expected: [
          [1, 4],
          [2, 5],
          [3, 6],
        ],
      },
      {
        label: "一列だけの格子",
        input: [[[5], [7], [9]]],
        expected: [[5, 7, 9]],
      },
      { label: "格子がない", input: [[]], expected: [] },
      { label: "列がない", input: [[[], []]], expected: [] },
    ],
    hints: [
      "入力の列が出力の行になります。",
      "外側のループを列番号にして内側で全ての行から同じ列の値を集めます。",
      "grid[行番号][列番号] を使い列ごとに新しい配列を作って結果へ追加しよう。",
    ],
    explanation:
      "二次元配列は行と列を独立した番号で扱えます。ループの順序を入れ替えると同じデータを別の向きで組み直せます。",
  },
  {
    id: "adv-brackets",
    title: "入れ子の命令を検査する",
    concept: "スタックと対応関係",
    briefing:
      "命令を囲む括弧が正しい順番で閉じているかを調べます。数が同じでも交差していたら不正です。",
    objective:
      "validBrackets(text) は () [] {} の6文字だけからなる文字列を受け取り全ての括弧が対応する正しい入れ子なら true を返します。空文字列も正しいものとします。",
    functionName: "validBrackets",
    parameters: "text",
    js: `const stack = [];
const opening = { ")": "(", "]": "[", "}": "{" };
for (const character of text) {
  if (character === "(" || character === "[" || character === "{") stack.push(character);
  else if (stack.pop() !== opening[character]) return false;
}
return stack.length === 0;`,
    py: `stack = []
opening = {')': '(', ']': '[', '}': '{'}
for character in text:
    if character in '([{':
        stack.append(character)
    elif not stack or stack.pop() != opening[character]:
        return False
return len(stack) == 0`,
    cases: [
      { label: "正しい入れ子", input: ["{[()]}()"], expected: true },
      { label: "交差した括弧", input: ["([)]"], expected: false },
      { label: "閉じ括弧が先に来る", input: [")("], expected: false },
      { label: "開いたままの括弧", input: ["(("], expected: false },
      { label: "空の命令", input: [""], expected: true },
    ],
    hints: [
      "最後に開いた括弧が最初に閉じる必要があります。",
      "開き括弧を配列の末尾へ積み閉じ括弧では最後の一つを取り出して対応を比較します。",
      "対応が違えばすぐ失敗です。全て読んだ後に開き括弧が残っていないことも確認しよう。",
    ],
    explanation:
      "末尾に追加し末尾から取り出す仕組みをスタックと呼びます。最後の作業から片づける必要がある入れ子構造の検査に適しています。",
  },
  {
    id: "adv-prefix-ranges",
    title: "複数区間の電力を求める",
    concept: "累積和による区間集計",
    briefing:
      "同じ電力列へ多くの区間集計が届きます。先頭からの累積和を一度作って集計を効率化しましょう。",
    objective:
      "rangeEnergy(values, ranges) は整数配列と区間 [left, right] の配列を受け取り各区間の両端を含む合計を返します。位置は0始まりで全て有効です。ranges が空なら空配列です。",
    functionName: "rangeEnergy",
    parameters: "values, ranges",
    js: `const prefix = [0];
for (const value of values) prefix.push(prefix[prefix.length - 1] + value);
return ranges.map(([left, right]) => prefix[right + 1] - prefix[left]);`,
    py: `prefix = [0]
for value in values:
    prefix.append(prefix[-1] + value)
return [prefix[right + 1] - prefix[left] for left, right in ranges]`,
    cases: [
      {
        label: "複数区間をまとめて集計",
        input: [
          [2, -1, 4, 0],
          [
            [0, 3],
            [1, 2],
            [3, 3],
          ],
        ],
        expected: [5, 3, 0],
      },
      {
        label: "先頭と末尾の境界",
        input: [
          [5, 7, 9],
          [
            [0, 0],
            [2, 2],
          ],
        ],
        expected: [5, 9],
      },
      { label: "負の合計も返す", input: [[-2, -3], [[0, 1]]], expected: [-5] },
      { label: "問い合わせがない", input: [[], []], expected: [] },
    ],
    hints: [
      "先頭からその位置の手前までの合計を保存しよう。",
      "累積和の先頭に0を置くと値がn個のとき累積和はn+1個になります。",
      "leftからrightまでの合計は prefix[right + 1] - prefix[left] です。",
    ],
    explanation:
      "先頭からの合計を使うと区間の合計を二つの値の差で求められます。何度も同じ部分を足し直す計算を避けられます。",
  },
  {
    id: "adv-island-count",
    title: "分断された電力区画を数える",
    concept: "格子の幅優先探索と訪問記録",
    briefing:
      "1の区画は上下左右に接続しています。未確認の区画から接続をたどり独立した電力網の数を調べます。斜めは接続しません。",
    objective:
      "countIslands(grid) は0と1の長方形の二次元配列を受け取り上下左右につながる1の集まりの個数を返します。空の格子は0です。入力は変更しないでください。",
    functionName: "countIslands",
    parameters: "grid",
    js: `if (grid.length === 0 || grid[0].length === 0) return 0;
const rows = grid.length;
const columns = grid[0].length;
const seen = new Set();
let count = 0;
for (let row = 0; row < rows; row++) {
  for (let column = 0; column < columns; column++) {
    const key = row * columns + column;
    if (grid[row][column] !== 1 || seen.has(key)) continue;
    count += 1;
    const queue = [[row, column]];
    seen.add(key);
    for (let head = 0; head < queue.length; head++) {
      const [r, c] = queue[head];
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr;
        const nc = c + dc;
        const next = nr * columns + nc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= columns || grid[nr][nc] !== 1 || seen.has(next)) continue;
        seen.add(next);
        queue.push([nr, nc]);
      }
    }
  }
}
return count;`,
    py: `if not grid or not grid[0]:
    return 0
rows = len(grid)
columns = len(grid[0])
seen = set()
count = 0
for row in range(rows):
    for column in range(columns):
        key = row * columns + column
        if grid[row][column] != 1 or key in seen:
            continue
        count += 1
        queue = [(row, column)]
        seen.add(key)
        head = 0
        while head < len(queue):
            r, c = queue[head]
            head += 1
            for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                nr = r + dr
                nc = c + dc
                key = nr * columns + nc
                if nr < 0 or nr >= rows or nc < 0 or nc >= columns or grid[nr][nc] != 1 or key in seen:
                    continue
                seen.add(key)
                queue.append((nr, nc))
return count`,
    cases: [
      {
        label: "三つの独立した電力網",
        input: [
          [
            [1, 1, 0, 0],
            [0, 1, 0, 1],
            [1, 0, 0, 1],
          ],
        ],
        expected: 3,
      },
      {
        label: "斜めはつながらない",
        input: [
          [
            [1, 0],
            [0, 1],
          ],
        ],
        expected: 2,
      },
      {
        label: "全て一つの電力網",
        input: [
          [
            [1, 1],
            [1, 1],
          ],
        ],
        expected: 1,
      },
      {
        label: "稼働区画がない",
        input: [
          [
            [0, 0],
            [0, 0],
          ],
        ],
        expected: 0,
      },
      { label: "空の格子", input: [[]], expected: 0 },
    ],
    hints: [
      "未訪問の1を見つけるたびに新しい集まりが一つ見つかります。",
      "見つけた区画から上下左右の1をキューへ追加し同じ集まりを全て訪問済みにします。",
      "キューへ追加するときに訪問記録を付けると同じ区画を何度も追加せずに済みます。範囲外も先に除外しよう。",
    ],
    explanation:
      "一つの開始地点から到達できる区画を全て塗り分ける探索です。訪問済みを記録すると循環や重複があっても各区画を一度だけ処理できます。",
  },
  {
    id: "adv-graph-route",
    title: "循環するネットワークを探索する",
    concept: "グラフの到達可能性と幅優先探索",
    briefing:
      "通信塔同士の接続から目的地へ到達できるかを調べます。経路に循環があっても探索が終わるようにしてください。",
    objective:
      "canReach(graph, start, target) は隣接リストで表された有向グラフで到達できれば true を返します。頂点番号は0以上で配列長未満です。空グラフなら false。有効な同じ頂点同士は true です。",
    functionName: "canReach",
    parameters: "graph, start, target",
    js: `if (graph.length === 0) return false;
const seen = new Set([start]);
const queue = [start];
for (let head = 0; head < queue.length; head++) {
  const node = queue[head];
  if (node === target) return true;
  for (const next of graph[node]) {
    if (seen.has(next)) continue;
    seen.add(next);
    queue.push(next);
  }
}
return false;`,
    py: `if not graph:
    return False
seen = {start}
queue = [start]
head = 0
while head < len(queue):
    node = queue[head]
    head += 1
    if node == target:
        return True
    for next_node in graph[node]:
        if next_node in seen:
            continue
        seen.add(next_node)
        queue.append(next_node)
return False`,
    cases: [
      {
        label: "複数の塔を経由して到達",
        input: [[[1, 2], [3], [3], []], 0, 3],
        expected: true,
      },
      {
        label: "循環しても到達しない",
        input: [[[1], [0], []], 0, 2],
        expected: false,
      },
      { label: "同じ塔なら移動不要", input: [[[1], []], 1, 1], expected: true },
      {
        label: "有向の接続は逆には進めない",
        input: [[[1], []], 1, 0],
        expected: false,
      },
      { label: "塔がない", input: [[], 0, 0], expected: false },
    ],
    hints: [
      "次に調べる塔をキューに置き調べた塔を集合に記録しよう。",
      "キューから取り出した塔の接続先を未訪問のときだけ追加します。",
      "目的地を見つけたら true。キューを全て調べても見つからなければ false を返そう。",
    ],
    explanation:
      "格子の探索を一般のネットワークへ広げた問題です。辺の向きと訪問記録を意識すると循環する大きな接続図も安全に探索できます。",
  },
];

function localizedProblem(language: Language, seed: Seed): Problem {
  const wrap = (body: string) =>
    language === "javascript"
      ? `function ${seed.functionName}(${seed.parameters}) {\n${body
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n")}\n}`
      : `def ${seed.functionName}(${seed.parameters}):\n${body
          .split("\n")
          .map((line) => `    ${line}`)
          .join("\n")}`;
  return {
    id: `${language}-${seed.id}`,
    title: seed.title,
    concept: seed.concept,
    briefing: seed.briefing,
    objective:
      language === "python" ? (seed.objectivePy ?? seed.objective) : seed.objective,
    functionName: seed.functionName,
    starter: wrap(
      language === "javascript"
        ? (seed.starterJs ?? "return null;")
        : (seed.starterPy ?? "return None"),
    ),
    solution: wrap(language === "javascript" ? seed.js : seed.py),
    tests: seed.cases.map((test) => ({
      ...test,
      input: structuredClone(test.input),
      expected: structuredClone(test.expected),
    })),
    hints: [...(language === "python" ? (seed.hintsPy ?? seed.hints) : seed.hints)],
    explanation:
      language === "python"
        ? (seed.explanationPy ?? seed.explanation)
        : seed.explanation,
  };
}

/** Each visible ring station is a real stage. Lessons share test data across
 * languages while keeping separate problem IDs, source code, rooms and saves. */
export function buildCampaign(language: Language, legacy: Course): Course {
  const oldProblems = legacy.stages.flatMap((stage) => stage.problems);
  const old = (suffix: string) => {
    const problem = oldProblems.find(
      (candidate) => candidate.id === `${language}-${suffix}`,
    );
    if (!problem) throw new Error(`既存教材が見つかりません: ${suffix}`);
    return {
      ...problem,
      tests: structuredClone(problem.tests),
      hints: [...problem.hints],
    };
  };
  const p = (seed: Seed) => localizedProblem(language, seed);
  const outer = [
    old("greeting"),
    old("battery"),
    old("signal"),
    ...basic.slice(0, -1).map(p),
    old("gate"),
    old("beacon"),
    old("drone"),
    p(basic[basic.length - 1]),
  ];
  const middle = [
    old("sum"),
    old("filter"),
    old("relay"),
    ...intermediate.map(p),
  ];
  const inner = advanced.map(p);
  const core = expert.map(p);
  const layers = [outer, middle, inner, core];
  const names = ["外縁層", "中層", "内層", "中心核"];
  const codes = ["OUTER", "MIDDLE", "INNER", "CORE"];
  const difficulty = ["基礎", "応用", "上級", "挑戦"];
  const stages: Stage[] = [];
  layers.forEach((problems, layer) =>
    problems.forEach((problem, slot) => {
      const index = stages.length;
      stages.push({
        id: `${language}-station-${String(index + 1).padStart(2, "0")}`,
        title: problem.title,
        subtitle: `${names[layer]}の拠点 ${String(slot + 1).padStart(2, "0")}`,
        location: `${codes[layer]} ${String(slot + 1).padStart(2, "0")} / ${difficulty[layer]}`,
        intro: `${names[layer]}の拠点${slot + 1}へ到着。${problem.briefing} この問題を修復するとこの拠点のゲートが開きます。周囲の拠点も攻略して中心への道をつなごう。`,
        outro: `「${problem.title}」を修復してこの拠点を復旧した。${layer === 3 ? "中心核の統合システムへ向けて残りの処理を確かめよう。" : "同じ層の拠点をすべて復旧するとさらに内側の層が解放されます。"}`,
        kind: index < 3 ? "tutorial" : "repair",
        problems: [problem],
      });
    }),
  );
  const previousBoss = legacy.stages.find((stage) => stage.kind === "boss");
  if (!previousBoss) throw new Error("既存の中心核が見つかりません。");
  stages.push({
    ...previousBoss,
    title: "中心核の3つの処理を統合せよ。",
    subtitle: "中心核の最終拠点",
    location: "CORE 06 / 最終統合",
    intro:
      "すべての層を突破し中心核の最終拠点へ到着した。競合を避ける電力配分・増加鎖の復元・経路の認証を別々に実装し最後に接続する。ここまで身につけた動的計画法と探索をひとつのシステムへまとめよう。",
    outro:
      "最適な電力が正しい経路を通って中心核へ届いた。外縁からつないできた54拠点がひとつのネットワークとして動き出す。君のコードが球のすべての層を再び結び直した。",
    problems: finalProblems.map(p),
  });
  if (
    stages.length !== 54 ||
    outer.length !== 20 ||
    middle.length !== 16 ||
    inner.length !== 12 ||
    core.length !== 5
  ) {
    throw new Error("各層の教材数が拠点の配置と一致しません。");
  }
  return { language, label: legacy.label, stages };
}

export const pythonWordGuide: [string, string][] = [
  ["引用符", "文字を囲む半角の記号です。\"NAVI\" の両端にある \" が引用符です。' も使えます。"],
  ["文字列", "文字や言葉を表すデータです。\"NAVI\" や \"おかえり\" のように引用符で囲みます。"],
  ["数値", "計算に使う数です。10や3.5などで、引用符を付けずに書きます。"],
  ["変数", "値に付ける名前です。energy = 10 と書くと、energy という名前で10を使えます。"],
  ["関数", "ひとまとまりの処理に名前を付けたものです。double(3) のように名前と丸かっこを書いて使います。"],
  ["引数", "関数に渡す値です。double(3) なら3です。"],
  ["戻り値", "関数が return で返す答えです。3を2倍にする関数なら、返ってくる6が戻り値です。"],
  ["整数", "0・1・-1など、小数部分のない数です。"],
  ["正の数・負の数", "0より大きい数が正の数、0より小さい数が負の数です。0はどちらにも入りません。"],
  ["偶数・奇数", "整数のうち、2で割った余りが0なら偶数、1なら奇数です。例：2は偶数、3は奇数。0も偶数です。"],
  ["真・偽", "条件が成り立つことを真、成り立たないことを偽と呼びます。Pythonでは True と False を使います。"],
  ["条件分岐", "条件によって処理を選ぶことです。例：電力が足りれば使い、足りなければ充電する。"],
  ["リスト・配列", "複数の値を順番に並べたものです。例：[2, 4, 6]。"],
  ["二次元配列", "値を行と列で並べたものです。Pythonでは [[1, 2], [3, 4]] のようにリストの中に各行のリストを入れて表せます。行は横、列は縦の並びで、この例は2行2列です。"],
  ["要素", "リストに入っている1つ1つの値です。[2, 4, 6] の要素は2、4、6です。"],
  ["添字・インデックス", "文字や値の位置を表す番号です。先頭は0、その次は1。text が \"ABC\" なら text[0] は \"A\" です。index はその番号を入れる変数名として使われます。"],
  ["スライス", "リストや文字列の一部分を取り出す書き方です。[開始:終了] の終了位置は含みません。[2:] は位置2から最後まで、[:2] は先頭から位置2の手前までです。"],
  ["len()", "文字数やリストの個数を調べます。len(\"ABC\") は3です。位置は0から数えるので、最後の位置は len(text) - 1 です。空の場合は取り出せる文字がありません。"],
  ["range()", "繰り返しに使う番号を用意します。range(3) は0、1、2です。range(開始, 終了, 足す数) と書くと進み方を指定できます。終了の番号は含みません。足す数が -1 なら1ずつ戻ります。"],
  ["メソッド", "データに対して行う操作です。name.upper() なら、name の英字を大文字にします。元の name の値は変わりません。"],
  ["ASCII", "半角のAや1、!、スペースなどの文字を扱う決まりです。問題にASCII文字列とあるときは、日本語は含みません。"],
  ["ループ", "同じ処理を繰り返すことです。for を使うと、リストの値を1つずつ処理できます。"],
  ["while文", "条件が成り立つ間、同じ処理を繰り返す書き方です。while remaining > 0: なら、remaining が0より大きい間、字下げした行を繰り返します。"],
  ["入れ子", "同じような構造を内側に重ねることです。for の中に for、リストの中にリストを入れる形などがあります。([]) のように、かっこの内側に別のかっこがある形も入れ子です。"],
  ["in・not in", "値が中にあるかを調べます。4 in [4, 7] は True、2 not in [4, 7] も True です。"],
  ["重複・既出", "重複は同じ値が2回以上あること、既出はすでに一度出てきたことです。[4, 7, 4] の最後の4は既出の値です。"],
  ["集合・set()", "同じ値を重ねて持たない仕組みです。set() で空の集合を作ります。最初に出てきた順番を残すには、別のリストを使います。"],
  ["add()", "集合に値を登録する操作です。seen.add(4) を2回実行しても、seen の中の4は1個だけです。"],
  ["辞書", "目印と値を組にして覚える仕組みです。例：{\"blue\": 2} は blue に2を対応させた辞書です。{} で空の辞書を作ります。"],
  ["キー", "辞書に保存した値を取り出すための目印です。{\"blue\": 2} では \"blue\" がキー、2が値です。counts[\"blue\"] のように使います。"],
  ["get()", "辞書から値を取り出す操作です。counts.get(\"blue\", 0) は、キー \"blue\" があればその値、なければ0を返します。"],
  ["有向グラフ", "地点同士のつながりに向きがあるものです。0 → 1 なら0から1へ進めます。1から0へも進めるかは、逆向きのつながりがあるかで決まります。"],
  ["頂点・辺", "グラフで、地点を「頂点」、地点同士のつながりを「辺」と呼びます。有向グラフでは、辺を矢印で表します。"],
  ["隣接リスト", "各地点から直接進める先を並べたものです。このコースでは graph[0] が [1, 2] なら、地点0から地点1と2へ進めます。空のリストなら、その地点から進める先はありません。"],
];

export const javascriptWordGuide: [string, string][] = [
  ["引用符", "文字を囲む半角の記号です。\"NAVI\" の両端にある \" が引用符です。' も使えます。"],
  ["文字列", "文字や言葉を表すデータです。\"NAVI\" や \"おかえり\" のように引用符で囲みます。"],
  ["数値", "計算に使う数です。10や3.5などで、引用符を付けずに書きます。"],
  ["変数", "値に付ける名前です。let energy = 10; と書くと、energy という名前で10を使えます。"],
  ["関数", "ひとまとまりの処理に名前を付けたものです。double(3) のように名前と丸かっこを書いて使います。"],
  ["引数", "関数に渡す値です。double(3) なら3です。"],
  ["戻り値", "関数が return で返す答えです。3を2倍にする関数なら、返ってくる6が戻り値です。"],
  ["整数", "0・1・-1など、小数部分のない数です。"],
  ["正の数・負の数", "0より大きい数が正の数、0より小さい数が負の数です。0はどちらにも入りません。"],
  ["偶数・奇数", "整数のうち、2で割り切れるものが偶数、それ以外が奇数です。例：2は偶数、3は奇数。0も偶数です。"],
  ["真・偽", "条件が成り立つことを真、成り立たないことを偽と呼びます。JavaScriptでは true と false を使います。"],
  ["条件分岐", "条件によって処理を選ぶことです。例：電力が足りれば使い、足りなければ充電する。"],
  ["配列", "複数の値を順番に並べたものです。例：[2, 4, 6]。"],
  ["二次元配列", "値を行と列で並べたものです。[[1, 2], [3, 4]] のように配列の中に各行の配列を入れて表せます。行は横、列は縦の並びで、この例は2行2列です。"],
  ["要素", "配列に入っている1つ1つの値です。[2, 4, 6] の要素は2、4、6です。"],
  ["添字・インデックス", "文字や値の位置を表す番号です。先頭は0、その次は1。values[0] は先頭の値を取り出します。index はその番号を入れる変数名として使われます。"],
  ["slice()・スライス", "配列や文字列の一部分を取り出す操作です。slice(開始, 終了) の終了位置は含みません。values.slice(2) は位置2から最後まで、values.slice(0, 2) は先頭から位置2の手前までです。"],
  ["concat()", "配列の後ろに別の配列をつないだ新しい配列を作ります。[1, 2].concat([3, 4]) の結果は [1, 2, 3, 4] です。"],
  ["length", "文字数や配列の個数を調べます。\"ABC\".length は3です。位置は0から数えるので、最後の位置は text.length - 1 です。空の場合は取り出せる文字がありません。"],
  ["番号を使うfor文", "for (let i = 0; i < 3; i = i + 1) は、0から始め、3未満の間、処理の後に1ずつ増やして繰り返します。i は0、1、2と進みます。"],
  ["メソッド", "データに対して行う操作です。name.toUpperCase() なら、name の英字を大文字にします。元の name の値は変わりません。"],
  ["ASCII", "半角のAや1、!、スペースなどの文字を扱う決まりです。問題にASCII文字列とあるときは、日本語は含みません。"],
  ["ループ", "同じ処理を繰り返すことです。for を使うと、配列の値を1つずつ処理できます。"],
  ["while文", "条件が成り立つ間、同じ処理を繰り返す書き方です。while (remaining > 0) なら、remaining が0より大きい間、{ } の中を繰り返します。"],
  ["入れ子", "同じような構造を内側に重ねることです。for の中に for、配列の中に配列を入れる形などがあります。([]) のように、かっこの内側に別のかっこがある形も入れ子です。"],
  ["includes()・has()・!", "値が中にあるかを調べます。配列では values.includes(4)、集合では seen.has(4) を使い、結果は true か false です。先頭に ! を付けると結果が反対になり、中にないかを調べられます。"],
  ["重複・既出", "重複は同じ値が2回以上あること、既出はすでに一度出てきたことです。[4, 7, 4] の最後の4は既出の値です。"],
  ["集合・Set", "同じ値を重ねて持たない仕組みです。new Set() で空の集合を作り、size で個数を調べます。このコースでは結果を別の配列に追加して返す方法も使います。"],
  ["add()", "集合に値を登録する操作です。seen.add(4) を2回実行しても、seen の中の4は1個だけです。"],
  ["オブジェクト・辞書", "目印と値を組にして覚える仕組みです。JavaScriptではオブジェクトを辞書として使えます。Object.create(null) で空の辞書を作り、counts[\"blue\"] = 2 で blue に2を対応させます。"],
  ["キー", "辞書に保存した値を取り出すための目印です。counts[\"blue\"] = 2 では \"blue\" がキー、2が値です。counts[\"blue\"] で値を取り出します。"],
  ["??", "左側が undefined や null のとき、右側の値を使う書き方です。counts[tag] ?? 0 は、まだそのキーの値がなければ0になります。保存済みの0はそのまま使います。"],
  ["有向グラフ", "地点同士のつながりに向きがあるものです。0 → 1 なら0から1へ進めます。1から0へも進めるかは、逆向きのつながりがあるかで決まります。"],
  ["頂点・辺", "グラフで、地点を「頂点」、地点同士のつながりを「辺」と呼びます。有向グラフでは、辺を矢印で表します。"],
  ["隣接リスト", "各地点から直接進める先を並べたものです。このコースでは graph[0] が [1, 2] なら、地点0から地点1と2へ進めます。空の配列なら、その地点から進める先はありません。"],
];
