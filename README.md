# RPG ToDo

毎日のタスクを「クエスト」として管理し、完了するとXPを獲得できるシングルページのToDoアプリです。MVPでは、遊びの核になる **LEVEL + XP** と **TODAY'S BOSS** に絞っています。

## フォルダー構成

```text
RPG-ToDo-MVP/
├── index.html                 # 画面のHTML
├── server.js                  # ローカル開発サーバー
├── src/
│   ├── app.mjs                # アプリ起動・イベント制御
│   ├── config.mjs             # XPなどの定数
│   ├── model.mjs              # データ構造・計算
│   ├── actions.mjs            # タスク状態の変更
│   ├── storage.mjs            # ブラウザ保存
│   └── ui/
│       ├── profile.mjs        # LEVEL / XP描画
│       ├── boss.mjs           # TODAY'S BOSS描画
│       ├── quests.mjs         # クエスト一覧描画
│       ├── dialog.mjs         # 追加ダイアログ
│       ├── feedback.mjs       # 通知・演出
│       └── helpers.mjs        # UI共通処理
├── styles/
│   ├── tokens.css             # 色・余白などの変数
│   ├── base.css               # 全体の基礎スタイル
│   ├── layout.css             # ページレイアウト
│   ├── player.css             # プレイヤー情報
│   ├── boss.css               # ボスカード
│   ├── quests.css             # クエスト一覧
│   ├── dialog.css             # 入力ダイアログ
│   ├── feedback.css           # 通知・レベルアップ演出
│   └── responsive.css         # スマートフォン対応
└── tests/                     # 計算と配信のテスト
```

## 実装済み

- LEVEL / XP表示と100XPごとのレベルアップ
- 難易度1〜5と連動したXP報酬
- その日の最重要タスクを「TODAY'S BOSS」に設定
- ボス撃破時の+100 XP
- タスクの追加、完了、未完了への復元、削除
- 未完了・すべて・完了フィルター
- レベルアップ演出と通知
- ブラウザ内への自動保存
- スマートフォン対応、キーボード操作、読み上げ補助、動きを減らす設定への対応

## VS Codeから起動（推奨）

1. ZIPを展開します。
2. VS Codeの「ファイル」→「フォルダーを開く」で、`index.html` と `server.js` が入っているフォルダーを開きます。
3. `F5` キーを押します。
4. 「RPG ToDoを起動」を選びます。

ローカルサーバーが起動し、`http://localhost:8080/` が自動的に開きます。アプリの利用中は、VS Code下部のターミナルを開いたままにしてください。

### ターミナルから起動

Node.jsがインストールされている場合：

```bash
npm start
```

Node.jsがない場合は、次のいずれかを実行します。

```bash
# Windows
py -m http.server 8080

# macOS / Linux
python3 -m http.server 8080
```

コマンドを実行したターミナルを閉じずに、ブラウザで `http://localhost:8080/` を開きます。`ERR_CONNECTION_REFUSED` は、通常このサーバーが停止しているときに表示されます。

この版はJavaScriptを役割別のES Modulesへ分割しているため、`index.html`の直接ダブルクリックではなく、F5または上記のローカルサーバーを使用してください。

## 公開

静的サイトとして構成しているため、フォルダー構造を維持したまま全ファイルをGitHub Pages、Netlify、Cloudflare Pages、Vercelなどに配置できます。ビルド処理は不要です。

## データについて

クエストとXPは、そのブラウザの `localStorage` に保存されます。別端末との同期、ログイン、サーバー保存はMVPの対象外です。ブラウザのサイトデータを消去すると、保存した内容も消去されます。

## 次の拡張候補

1. GOLDとショップ（背景・アイコン・キャラクター・テーマ）
2. ユーザー登録とクラウド同期
3. デイリー／ウィークリークエスト
4. 連続達成記録と実績
5. プッシュ通知と期限リマインダー

## ロジックテスト

Node.jsがある環境では、次のコマンドでXP計算、難易度報酬、保存データの正規化、ローカルサーバーからのファイル配信を確認できます。

```bash
npm test
```
