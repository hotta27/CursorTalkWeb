# NotificationAI

Notionの当日予定を表示し、開始・終了時にWindows通知を行うElectronアプリです。  
右側にVRMキャラクターを常時表示し、通知イベントに応じてリアクションします。

## 必要なもの

- Node.js 20+
- Notion Integration Token
- Notion Database ID
- `assets/avatar.vrm` (任意のVRMモデル)

## セットアップ

1. `.env.example` を `.env` にコピー
2. `.env` に `NOTION_API_KEY` / `NOTION_DATABASE_ID` を設定
3. 依存導入
   - `npm install`
4. ビルド
   - `npm run build`
5. 起動
   - `npm run dev`

## Notion DBプロパティ

- `タイトル` (Title)
- `日付` (Date)
- `開始時間` (Date)
- `終了時間` (Date)
- `URL` (URL)

## 主な機能

- 起動時に当日スケジュールを取得
- 縦型タイムライン表示
- 予定クリックでNotionページを開く
- 開始・終了時のトースト通知
- 通知に連動したVRM状態変化 (`idle`, `notify`, `talk`)
- Windowsログイン時の自動起動設定
