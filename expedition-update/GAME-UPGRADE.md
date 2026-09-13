# 遠征・コマンド戦闘 更新パック / EXPEDITION UPDATE 1

## 今回の動作

- ステージ1から順番に進み、勝利すると次のステージへ。
- レベル選択・モンスター選択はありません。
- 5、10、15…100ステージにボスが出現。ボス間隔は5です。
- 全100ステージ。100のボスを倒すと遠征クリアです。
- プレイヤーはToDoで育てた自分の1人。敵は1〜3体。
- 通常攻撃、戦闘スキル、防御、回復、必殺技。
- 通常攻撃と防御でSP+1。戦闘スキルと回復でSP−1。SP上限5。
- 行動順は速度で決定。上部の行動順で次の相手を確認できます。
- 物理・雷の弱点を突くと靭性が減少。0で弱点撃破。
- 弱点撃破すると追加ダメージ、行動遅延、被ダメージ25%増加。
  敵は次の行動を使って復帰し、その行動では攻撃しません。
- エネルギー100で必殺技。敵全体に攻撃し、すべての弱点に有効です。
  自分のターンに使用でき、通常の行動を消費しません。
- 単体・隣接・全体攻撃、対象選択、ボスの怒り、連撃・吸収・回復。
- 10種類の敵のアニメーションと図鑑を引き継ぎます。
- 技のキー操作1〜4、必殺技5。音・速度・演出控えめの切り替え。

これはコマンド選択・行動順・弱点撃破を取り入れたオリジナルの2D戦闘です。
3Dゲームや4人パーティー、敵の行動中に割り込む必殺技は実装していません。
戦闘はJavaScript ES Modules＋Canvas。追加ライブラリやビルドは不要です。

## ToDoと保存

ToDoの index.html、src/app.mjs、src/model.mjs、src/storage.mjs、
毎日タスク関連、ToDo用CSS、server.js は変更していません。

PLAYER LEVEL は元のToDoのXPから読み取り、HP・攻撃力に反映します。
プレイヤーのHPと攻撃力の計算式は前版と同じです。
ゲームでToDoのXPを増減させません。

以前のGOLD、総勝利・敗北、最高クリア、モンスター別討伐数は残ります。
以前の自由選択レベルは連続クリアの証拠ではないため、
新しい遠征の進行だけステージ1から始まります。

ゲーム保存キー：rpg-todo:game:v1（既存キーを引き継ぎ）
ToDo保存キー：rpg-todo:v1（ゲームから書き込みません）
localStorageを削除する必要はありません。

HP・SP・エネルギーは戦闘開始時に初期化。
保存するのはクリア進行・GOLD・戦績です。戦闘途中のターンは保存しません。
ページを再読み込みすると未クリアの同じステージから再挑戦します。
別ブラウザ・別ドメイン・別ポートでは保存が別になります。

## 導入（バックアップ付き）

これはゲーム部分の更新パックです。ZIPだけではToDoアプリとして起動しません。
元のプロジェクトを残してください。フォルダごと削除・置換しないでください。

1. ZIPを元のプロジェクトに置きます。
2. VS Codeのターミナルで以下を実行します。

```bash
cd /home/harustoko/work/RPG-ToDo-MVP
unzip RPG-ToDo-Expedition-Update-20260912.zip -d expedition-update
node expedition-update/INSTALL-GAME.mjs /home/harustoko/work/RPG-ToDo-MVP
```

INSTALL-GAME.mjs は元のToDoファイルの存在を確認してから、
上書きするゲームファイルを兄弟フォルダへバックアップし、
ゲーム関連だけを元のプロジェクトに統合します。
バックアップ先は実行結果に表示されます。

同名の expedition-update がすでにある場合は、
新しい空の展開先名を使い、その名前でインストーラーを実行してください。

3. 元のプロジェクトで起動します。すでにサーバーが動いていれば再利用できます。

```bash
cd /home/harustoko/work/RPG-ToDo-MVP
node server.js
```

ブラウザで http://127.0.0.1:8080/battle.html を開き、Ctrl+Shift+R で再読み込みします。
画面下の EXPEDITION UPDATE 1 が更新の目印です。
展開先で node server.js を実行しないでください。元のserver.jsを使います。

手動導入する場合も battle.html、src/battle-app.mjs、src/game、
styles/game.css、assets/game を元の同名の場所へ統合します。
元のToDoファイルは残します。

## GitHub Pagesへ反映

元のプロジェクトで動作を確認してから、ゲーム関連の差分を公開します。

```bash
git diff --stat
git add battle.html src/battle-app.mjs src/game styles/game.css assets/game
git commit -m "Add stage progression and tactical command battles"
git push
```

このパックの作成時点ではGitHubへのpush・公開は行っていません。
展開用フォルダやZIPを一括で git add しないでください。

## ファイルと役割（RPG-ToDo-MVPからのパス）

- battle.html：戦闘ページ
- src/battle-app.mjs：起動・終了
- src/game/Game.mjs：ToDoレベル、遠征進行、戦闘画面の調整
- src/game/config.mjs：Canvas設定・最大ステージ100・ボス間隔5
- src/game/data/stages.mjs：各ステージの敵編成・能力・弱点
- src/game/data/monsters.mjs：10種類のモンスターの行動・素材
- src/game/data/skills.mjs：通常攻撃・戦闘スキル・必殺技等
- src/game/data/sprite-atlas.mjs：画像内のアニメーション範囲
- src/game/battle/battle-engine.mjs：SP、ダメージ、行動順、弱点撃破のルール【新規】
- src/game/battle/combat-rules.mjs：ToDoレベルからの能力計算と敵行動予測
- src/game/battle/battle-controller.mjs：ルールを動くキャラクターと結びつける処理
- src/game/entities/actor.mjs：各キャラクターのアニメーション状態
- src/game/rendering/canvas-renderer.mjs：背景・複数敵・対象マーカー・必殺技演出
- src/game/ui/game-ui.mjs：進行表示・敵選択・靭性・SP・技ボタン
- src/game/storage/game-storage.mjs：保存の引き継ぎと一段階ずつの進行
- src/game/bridge/todo-level.mjs：ToDoからの読み取り専用連携
- src/game/core/：画像読込・音声・移動・描画ループ
- src/game/index.mjs：ゲームの公開入口
- styles/game.css：戦闘専用CSS
- assets/game/：プレイヤー、背景、enemies/内のモンスター10種類
- tests/game-quality.test.mjs：回帰テスト（インストーラーではコピーしません）
- INSTALL-GAME.mjs：バックアップ付き導入スクリプト（ゲーム本体ではありません）

## 検証

- 22件の自動テスト：順番どおりの進行、20回のボス、旧保存の保持、
  ToDo非変更、SP、必殺技、弱点撃破、対象選択、連打防止、キャンセル、
  100ステージの戦闘シミュレーションなど。
- 37URLのHTTP配信とJavaScriptモジュール・画像の存在を確認。
- ネイティブCanvasでボス1体・敵3体の描画と各アニメーション状態を確認。
- この環境ではローカルブラウザ接続が制限されているため、
  実ブラウザのクリック・CSSレイアウト・スマートフォン・音声確認は未完了です。
- 本格的な難易度調整には実プレイでの追加確認が必要です。

元のGitリポジトリへ tests/game-quality.test.mjs をコピーした場合：
```bash
node --test tests/game-quality.test.mjs
```
ToDo非変更のテストではGitのHEADと元のファイルを比較します。
