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

## Windows: ログオン時に開発サーバーを自動起動

ユーザーが Windows にログオンしたときに、このリポジトリ直下で `npm run dev`（Next.js 開発サーバー）を起動するよう、**タスク スケジューラ**に登録できます。

- **登録スクリプト**: [`scripts/register-windows-logon-task.ps1`](scripts/register-windows-logon-task.ps1) … タスクを作成・更新します（同名タスクがあれば置き換え）。
- **実行バッチ**: [`scripts/dev-at-login.bat`](scripts/dev-at-login.bat) … リポジトリルートへ移動して `npm run dev`。タスク実行時は PATH が足りないことがあるため、一般的な Node / nvm-windows のパスも補強しています。
- **タスク名**: `NotificationAI npm run dev`
- **動き**: ログオン時に `cmd.exe /k` で上記バッチを実行するため、コンソールウィンドウが開いたままログを確認できます。

### 登録・削除（管理者権限は不要）

リポジトリのルートで PowerShell を開き、実行ポリシーが必要な場合は `-ExecutionPolicy Bypass` を付けます。

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register-windows-logon-task.ps1
```

タスクを削除するとき:

```bat
schtasks /Delete /TN "NotificationAI npm run dev" /F
```

### 確認コマンド

タスクがスケジューラ上で **有効で待機しているか／実行中として記録されているか**:

```powershell
Get-ScheduledTask -TaskName "NotificationAI npm run dev" | Select-Object TaskName, State
```

`State` が `Ready` のときは「タスク自体は待機中」です。`npm run dev` のように常駐する処理は、起動後すぐにタスク側は `Ready` に戻りやすく、**実際のサーバーは別プロセス（Node）** で動いていることがあります。

直近の実行時刻・終了コードなど:

```powershell
Get-ScheduledTaskInfo -TaskName "NotificationAI npm run dev"
```

タスクの詳細（実行コマンド・開始フォルダなど）を CMD で見る場合:

```bat
schtasks /Query /TN "NotificationAI npm run dev" /FO LIST /V
```

開発サーバーが **ポート 3000 で待ち受けているか**（既定の Next.js）:

```bat
netstat -ano | findstr :3000
```

何も表示されなければ、現時点では 3000 番で LISTEN しているプロセスが無い可能性が高いです（別ポートで起動している場合は表示されません）。

タスクをいますぐ試す（ログオンを待たずに実行）:

```bat
schtasks /Run /TN "NotificationAI npm run dev"
```

その後、ブラウザで `http://localhost:3000` を開いて応答を確認してください。

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
