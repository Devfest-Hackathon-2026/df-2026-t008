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

- npm test：54件成功
- npm run build：成功
- 公開URLでJavaScriptの3問を実行してゲート解放と次章への遷移を確認
- Firestoreで本人の読み書きと別ユーザーの読み取り拒否を確認
- 公開URLでPython実行の正解判定と2人協力の参加・修復同期・退出を確認

Gemini 3.8 FlashをCloud Runから呼び出してヒントと実行エラーの説明を返します。キーはSecret Managerに保存します。正誤はAIに任せず実行テストで判定します。

公開画面でGeminiのヒントと実行失敗の説明が表示されることを確認しました。
