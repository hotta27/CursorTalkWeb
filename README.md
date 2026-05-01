# NotificationAI

Notionの当日予定を表示し、開始・終了時にWindows通知を行うNext.jsアプリです。  
右側にVRMキャラクターを表示し、通知イベントに応じてリアクションします。

## 技術スタック

- Next.js + React
- Tailwind CSS
- Three.js + `@pixiv/three-vrm` + `@react-three/fiber`
- Notion API

## 必要なもの

- Node.js 20+
- Notion Integration Token
- Notion Database ID
- `public/avatar.vrm` (任意のVRMモデル)

## セットアップ

1. `.env.example` を `.env` にコピー
2. `.env` に `NOTION_API_KEY` / `NOTION_DATABASE_ID` を設定
3. 依存導入
   - `npm install`
4. 開発起動
   - `npm run dev`
5. 本番ビルド
   - `npm run build && npm run start`

## Notion DBプロパティ

- `名前` (Title)
- `日付` (Date with start/end)
- `URL` (URL)
- `ステータス` (Select) ※ `進行中` を取得対象

## 主な機能

- 起動時に当日スケジュールを取得
- 縦型タイムライン表示
- 予定クリックでNotionページを開く
- 開始・終了時のトースト通知
- 通知に連動したVRM状態変化 (`idle`, `notify`, `talk`)
- 通知が拒否されている場合はアプリ内表示でフォールバック
