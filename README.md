# Please — コードで世界をつなぐ。

チーム：kindchord（Tokyo会場）
代表：柴田奏心 / メンバー：稲田ちとせ

公開URL：https://please-kindchord.web.app

PCブラウザで開いてJavaScriptまたはPythonを選んでください。アカウントなしのソロと匿名認証による2〜4人の協力を利用できます。Pythonの初回起動は実行環境のダウンロードに少し時間がかかります。

公開版はFirebase Hostingで配信し協力状態はFirebase Realtime Databaseに保存します。Google認証の接続と本人専用のFirestore進捗保存も設定しています。Gemini 3.8 FlashをCloud Run経由で呼び出しヒントと実行失敗の説明を表示します。通常の3段階ヒントも利用できます。

既存Google Cloudプロジェクト `photo-app-e6774` にPlease専用Hostingサイト `please-kindchord` を追加しています。既存サイトは上書きしていません。Firestoreは `pleaseUsers/{uid}/progress/{language}` に保存し既存ルールを保持したうえでこのパスだけを追加しています。

注意：共有プロジェクトのFirestoreルール全体をこのリポジトリの単独ルールで置き換えないでください。公開用firebase.jsonにはFirestoreの自動デプロイ指定を含めていません。


興味はあるけれどまだコードを書いたことがない人のためのPCブラウザ向けプログラミング冒険ゲームです。仮想世界の住人となり壊れたコードを直して端末を復旧します。すべてのロックを解除すると次のエリアへ。最後は自分で関数を実装して世界を支えるサーバー群を守ります。

JavaScriptとPythonは問題・ルーム・個人の進捗が独立したコースです。各コースは4章×3問計12問。両コースで24問を収録しています。

| 章 | 舞台 | 内容 |
| --- | --- | --- |
| 1 | はじまりの拠点 | 文字列・計算・引数と戻り値 |
| 2 | コモンズの街 | 比較・条件分岐・複数の条件 |
| 3 | 都市間ネットワーク | ループ・配列・集計 |
| 4 | 世界のルート・コア | 認証・電力配分・復旧通信を自分で実装 |

## 起動

Node.js 22以降とnpmを使用します。初回の依存関係の取得にはインターネット接続が必要です。

```sh
npm install
npm run dev
```

[http://127.0.0.1:5173](http://127.0.0.1:5173) をPCブラウザで開いてください。Viteの画面サーバーと協力用のNode.js WebSocketサーバーが同時に起動します。Google Cloudの設定がなくてもゲストのソロとローカルサーバー上の協力を遊べます。

ビルドした成果物を起動する場合：

```sh
npm run build
npm start
```

[http://127.0.0.1:3001](http://127.0.0.1:3001) で画面と協力サーバーの両方を配信します。既定はループバックにのみ接続します。別のPCから接続する際はアクセスを許可できるネットワークで `HOST=0.0.0.0 npm start` としサーバーPCのIPアドレスを使用してください。

```sh
npm test
```

問題データ教材の正解例進捗ルームの制約をテストします。Python教材の正解例のテストにはローカルの `python3` が必要です。ゲーム内のPython実行にはローカルのPythonインストールは不要です。

## 遊び方

1. JavaScriptまたはPythonのコースを選びソロか協力を選択します。
2. 物語を読んだら3Dの端末か右側のミッションをクリックします。
3. 問題文を読みコードを直して「コードを実行」。ヒントは3段階で開けます。
4. 全端末を復旧したら「次のエリアへ」。最終章では関数を自分で書きます。

WASD／矢印キーで移動ドラッグで視点変更Tabで空白4つCtrl／Command＋Enterで実行できます。時間制限・残機はありません。実行が無限ループになったときの停止時間はゲームの制限時間ではなくブラウザを保護するためのものです。

ソロではこのブラウザに進捗と編集中のコードを自動保存します。協力は2〜4人でルームコードを共有し端末を分担します。同じ端末を同時に編集することはできません。退出した人の端末は他の人が引き継げます。**協力のクリアはソロの進捗には反映しません。**

設定なしの協力ルームはNode.jsサーバーのメモリ上にあります。最後の人が退出した場合サーバーが再起動した場合またはデプロイが切り替わった場合は消えます。Firebase Realtime Databaseを設定するとクラウド同期に切り替わります。どちらも全員退出後の再開は初期版の対象外です。

## コード実行と現在の制約

文字列に特定の答えが含まれているかを見る方式ではなく提出した関数を実行し複数の入力と期待値を比較します。

- JavaScript：ブラウザのJavaScriptエンジンで実行。
- Python：Pyodide（WebAssembly版Python）で実行。初回は `cdn.jsdelivr.net` から実行環境を読み込むためインターネット接続が必要です。
- どちらもアプリのCookieやローカルストレージにアクセスできないサンドボックスiframe内のWorkerで動作します。長時間実行は打ち切ります。Node.jsサーバーで学習者のコードを直接実行しません。

現段階の協力モードは参加者同士が協力するための仕組みです。採点結果をクライアントから通知するため改造したクライアントによる不正なクリア通知までは防ぎません。ランキングや競技用途に展開する場合はサーバー側の隔離環境で再採点する必要があります。

NAVIには常に使える問題別の段階ヒント・解説があります。加えて設定を行うとGeminiへの質問ボタンを使えます。AIへの質問時とコード実行に失敗したときに問題情報・編集中のコード・失敗した実行結果をサーバー経由でGeminiに送ります。AIはヒント担当で正誤の確定はテストが行います。

## Googleサービスの接続

ローカル起動時にはクラウドの認証情報を要求しません。Google機能を使う場合は `.env.example` を `.env.local` にコピーして設定します。`.env.local` はGit管理しません。Viteの `VITE_` で始まる設定は画面のビルドに埋め込まれます。変更後は開発サーバーを再起動し公開用には再ビルドしてください。

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_DATABASE_URL=https://your-database.firebasedatabase.app
VITE_ENABLE_AI=false
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
VITE_API_URL=
```

### 認証とソロのクラウド保存

Firebase ConsoleでGoogleと匿名認証を有効にし利用するホストを認証の許可済みドメインに追加します。Firestoreの保存先は `users/{uid}/progress/{language}` です。リポジトリの `firestore.rules` を適用すると本人の進捗のみを読み書きする設定になります。

ゲストは端末内でソロ進捗を持ちGoogleログイン時に保存先を引き継ぎます。すでにアカウント側に進捗がある場合は到達章・修復記録を統合します。

### Google上での協力

`VITE_FIREBASE_DATABASE_URL` を設定するとNode.js WebSocketではなく **Firebase Realtime Database** のアダプターを選びます。認証も設定し`database.rules.json` を適用してください。ルームの入退室端末の担当コードの共有修復進行位置の同期を行います。同じアカウントの複数タブは同じ参加者として扱われるため協力の確認には別アカウントまたは別ブラウザのゲストを使ってください。

切断時に参加状態を消し残った仲間が端末を引き継げます。全員退出後のルームは再開しません。古いデータは参加時にも確認します。このアダプターも協力用であり不正なクライアントによる操作を完全に防ぐ競技用の判定サーバーではありません。

### Geminiのヒント

`VITE_ENABLE_AI=true` にし**サーバー側だけ**に `GEMINI_API_KEY` を設定します。APIキーに `VITE_` を付けないでください。ブラウザには配信しません。利用可能なモデルは `GEMINI_MODEL` で変更できます。

`npm run dev` と `npm start` は存在する場合に `.env` と `.env.local` を順に読み込みます。Node.jsサーバーを直接起動する場合は例えば次のように指定します。

```sh
node --env-file=.env.local --import tsx server/index.ts
```

公開画面とAPIの配信元が異なる場合は画面側の `VITE_API_URL` にCloud Run等のAPIのURLを設定しサーバー側の `ALLOWED_ORIGIN` に画面の配信元（例：`https://your-project.web.app`）を指定します。`VITE_API_URL` が空なら同じ配信元の `/api/hint` を使います。

未設定やAPIエラー時も通常の段階ヒントは使えます。AIリクエストには本文のサイズ制限・タイムアウト・簡易レート制限がありますが公開規模を広げる前に認証・利用量制御を追加してください。

### Firebase HostingとCloud Run

`firebase.json` は `dist` の配信とFirestore／Realtime Databaseのルールを指定しています。Firebase CLIを別途用意し対象プロジェクトを明示してデプロイします。

```sh
npm run build
firebase deploy --project YOUR_PROJECT_ID --only hosting,database
```

Realtime Databaseを使用すればFirebase Hostingで配信した画面からGoogle上で協力できます。AIを使わなければ画面のためにNode.jsサーバーを公開する必要はありません。

`Dockerfile` はNode.jsサーバーとビルド済み画面をCloud Runで実行するためのものです。イメージをビルド・登録した後のデプロイ指定の骨格は次のとおりです。プロジェクト・リージョン・公開範囲・環境変数・シークレットは実際のGoogle Cloud環境に合わせて設定してください。

```sh
gcloud run deploy knot --image YOUR_IMAGE_URL --region YOUR_REGION --max-instances 1
```

Node.js WebSocket方式をそのままCloud Runに載せる場合ルームがプロセスのメモリにあるため単一インスタンスのデモ用途に限ります。再起動やリクエスト期限による切断でもルームが失われ得ます。Google環境ではRealtime Database方式を推奨します。

Firebase Hosting・匿名認証・Realtime Databaseの公開接続を設定しています。Gemini APIはCloud Runのサーバーで呼び出します。キーはSecret Managerで管理しブラウザには配信しません。コード実行はブラウザの隔離環境で実装しておりCloud Runのサンドボックスでのサーバー再採点は今後の拡張です。

## 問題・物語を追加する

教材は `src/content/courses.ts` にあります。画面の実装を書き換えず問題データとステージの内容を変更できます。

各問題には次の情報を用意します。

```ts
{
  id: 'javascript-example',
  title: '端末の電力を計算',
  concept: '計算と戻り値',
  briefing: 'セル1つにつき電力5。計算を修復しよう。',
  objective: 'power(cells) が cells の5倍を返すようにしよう。',
  functionName: 'power',
  starter: 'function power(cells) { return cells + 5; }',
  solution: 'function power(cells) { return cells * 5; }',
  tests: [
    { label: 'セル3個', input: [3], expected: 15 },
    { label: 'セル0個', input: [0], expected: 0 },
  ],
  hints: ['演算子を見よう。', '掛け算は *。', 'cells * 5 を返そう。'],
  explanation: '同じルールでどんな個数にも対応できます。',
}
```

`input` は関数へ渡す**引数の配列**です。配列そのものを1つの引数にするなら `input: [[1, 2, 3]]` とします。戻り値は数値・文字列・真偽値・配列などJSONで表現できる値を使用します。コードの書き方が違っても結果が一致すれば正解です。

収録教材ではJS/Pythonのコードだけを切り替える共通生成ヘルパーを使用しています。各コースの問題IDは言語名で始まり進捗とルームを混同しません。JavaScriptの変数宣言や比較演算子とPythonの字下げや真偽値の表記の違いにも合わせてください。

ステージには `title``intro``outro``kind` と `problems` を設定します。通常ステージは全問修復が進行条件です。ボスでは各関数のテストに加えて`distribute → recover → authorize` とつなぐ統合テストを実行し世界全体の接続を確認します。統合シナリオは `src/lib/boss.ts` で管理します。最初の実装は4章を前提とする保存バリデーションを持つため章数を増やす際は `src/lib/progress.ts` の上限も合わせて見直してください。

正解例を変更したらテストを実行し通常の値だけでなく0・境界の値・空配列なども確かめてください。正解例は学習用の見本であり秘匿テストや競技向けの解答保護を目的とした構成ではありません。

## 構成

```text
src/App.tsx              画面・進行・問題操作
src/components/World.tsx 3D空間と操作
src/content/courses.ts   問題・ヒント・物語
src/lib/runner.ts        ブラウザ内コード実行
src/lib/boss.ts          最終章の関数をつなぐ統合テスト
src/lib/progress.ts      ソロの保存とマージ
src/lib/firebase.ts      オプションの認証・クラウド保存
src/lib/firebaseRooms.ts Realtime Databaseによる協力
src/lib/rooms.ts         協力クライアントの切替
src/lib/ai.ts            オプションのAIヒントクライアント
server/                 協力ルーム・WebSocket・Gemini API
firebase.json           Firebaseの配信とルールの設定
Dockerfile              Cloud Run等に配信するコンテナ
tests/                  教材・保存・ルームのテスト
```

公開版の最新の動作確認結果はSUBMISSION.mdを参照してください。
