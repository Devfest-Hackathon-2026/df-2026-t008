/** Keep the interpreter's original message while explaining the next step. */
export function explainRuntimeError(raw: string): string {
  const message = raw.length > 4000 ? raw.slice(0, 4000) + "\n…（省略）" : raw;
  let guide = "";
  if (/IndentationError|TabError/.test(message))
    guide =
      "字下げ（行頭の空白）を確認しよう。Pythonでは同じまとまりの行を同じ数の空白でそろえます。";
  else if (/SyntaxError/.test(message))
    guide =
      "コードの書き方を確認しよう。かっこ・引用符の閉じ忘れやPythonの行末の「:」がないか見てみよう。";
  else if (/NameError|ReferenceError/.test(message))
    guide =
      "名前が見つからないようです。変数や関数のつづり大文字・小文字使う前に定義されているかを確認しよう。";
  else if (/TypeError/.test(message))
    guide =
      "データの種類や引数の数が合っていないようです。数値・文字列・配列を問題の指定どおりに使っているか確認しよう。";
  else if (/IndexError/.test(message))
    guide =
      "配列の範囲を超えています。要素の番号は0から始まり最後の番号は「長さ − 1」です。";
  else if (/KeyError/.test(message))
    guide =
      "指定した項目が見つかりません。辞書のキーのつづりとデータにその項目があるかを確認しよう。";
  else if (/ZeroDivisionError/.test(message))
    guide =
      "0で割ろうとしています。割る数が0のときの処理を条件分岐で考えてみよう。";
  else if (/RecursionError|Maximum call stack/.test(message))
    guide =
      "同じ関数を呼び続けているようです。繰り返しや再帰が終わる条件を確認しよう。";
  else if (/ModuleNotFoundError|ImportError/.test(message))
    guide =
      "この実行環境ではその追加ライブラリを使えません。問題は追加ライブラリなしで解けるようになっています。";
  else if (/ValueError/.test(message))
    guide =
      "処理に使えない値が渡されています。入力例と関数に渡す値の範囲を確認しよう。";
  else if (/RangeError|MemoryError/.test(message))
    guide =
      "作るデータや繰り返しの回数が大きすぎるかもしれません。終了条件と配列の大きさを確認しよう。";
  return guide ? `${guide}\n\n元のエラー：\n${message}` : message;
}
