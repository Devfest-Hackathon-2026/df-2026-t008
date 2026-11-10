# Please 提出情報

- 会場：Tokyo
- チーム：kindchord
- 代表：柴田奏心
- メンバー：稲田ちとせ
- 公開URL：https://please-kindchord.web.app
- 提出フォルダ：https://drive.google.com/drive/folders/18blGk-KglRtqLuKcZ34uPh8_jkYC2VtG
- 説明資料：https://docs.google.com/document/d/1J65X7nNGBMI7d6egdXQxh7umDYXxaeuSTS-wZw9k-Og/edit
- スライド：https://docs.google.com/presentation/d/1HNAFYi7QPWlyEszsgTdZxLq7Qda89lVdrCfE5F51A1Q/edit
- 著作物：https://docs.google.com/spreadsheets/d/1-Hc4xInrUeXdkKUD7fxCgs3Si_cBDVp9ctjGuBEzFGw/edit

フォームは送信していません。資料のリンク公開と著作物シートの誓約は提出前に確認が必要です。

## 検証

- npm test：63件成功
- npm run build：成功
- 公開URLで54ステージのマップを表示しJavaScriptの最初の問題を実行してゲート解放と次の拠点への遷移を確認
- Firestoreで本人の読み書きと別ユーザーの読み取り拒否を確認
- 公開URLでPython実行の正解判定と2人協力の参加・修復同期・退出を確認

Gemini 3.8 FlashをCloud Runから呼び出してヒントと実行エラーの説明を返します。キーはSecret Managerに保存します。正誤はAIに任せず実行テストで判定します。

公開画面でGeminiのヒントと実行失敗の説明が表示されることを確認しました。

各コース54ステージ・56問でJavaScriptとPythonの合計112問を収録しています。デモ動画は54ステージ版で撮り直し実際のGeminiヒントとエラー説明を含めています。

新デモ：https://drive.google.com/file/d/1Hn7Wl1_g6IiY7ioaneCHuvftjtk0eAs1/view
同じ動画ファイルをスライドの3枚目に埋め込みました。ログインなしで再生が進み終盤まで到達することを確認済みです。実操作を約60秒に編集しています。
