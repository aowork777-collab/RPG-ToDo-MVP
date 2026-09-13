# モンスターアニメーション更新 / 2026-09-12

## 重要：これはゲーム部分だけの更新パックです

このZIPだけではToDoアプリとして起動しません。
元の RPG-ToDo-MVP にファイルを追加・上書きしてください。
元のプロジェクト、src、assets、styles フォルダを削除・丸ごと置換しないでください。
フォルダを統合し、ZIPに含まれる同名ファイルだけを上書きします。

ToDoの index.html、src/app.mjs、src/model.mjs、src/storage.mjs、
毎日タスク機能、ToDo用CSS、server.js は含めていません。
それらは元のプロジェクトのものをそのまま残します。

## 今回の追加

- 全10種類に待機・攻撃・被弾・倒れるアニメーション（各12ポーズ）。
- ミミック、フロストゴーレム、フェニックスを追加。
- モンスターと敵レベル1〜99を別々に選択。「おまかせ」も使用可能。
- 敵ごとに3手の行動パターン。連撃、防御、HP吸収、回復。
- ドラゴンとフェニックスはHP40%以下で怒り、攻撃倍率+15%。
- 炎・氷・闇の飛び道具、強攻撃の予備動作、ダメージ演出。
- 討伐回数を残すモンスター図鑑。
- 敵画像は選択したものを読み込み、全10体の読み込み完了を待ちません。
- 音ON/OFF、演出控えめ、速度1/1.5/2倍、技のキー操作1〜4。

## 変えないもの

PLAYER LEVEL は元のToDoのXPを読み取って計算します。
プレイヤーのHP・MP・攻撃力の計算式は前版と同じです。
戦闘でToDoのXPは増減せず、タスクにも変更を加えません。

保存先：
- ToDo：rpg-todo:v1（ゲームから書き込みません）
- ゲーム：rpg-todo:game:v1（従来のGOLD・勝敗・最高クリアを引き継ぎ）
- 討伐回数は今回から記録。過去の総勝利数から種別を復元しません。

同じサイトでも別ブラウザ・別ポート・別ドメインの保存データは共有されません。
ローカルで育てたデータがGitHub Pagesへ自動で移るわけではありません。
更新時にlocalStorageを削除する必要はありません。

## 導入

1. 既存の RPG-ToDo-MVP をバックアップしてください。
2. ZIPを別フォルダへ展開します。
3. 展開された battle.html を元の RPG-ToDo-MVP/battle.html に上書きします。
4. src、styles、assets の中身を元の同名フォルダに統合します。
   元からある別のファイルは残してください。
5. 次の場所から起動します。

```bash
cd /home/harustoko/work/RPG-ToDo-MVP
node server.js
```

http://127.0.0.1:8080/battle.html を開きます。
更新パックの展開先で node server.js を実行しないでください。
server.js は元のプロジェクトにあるファイルを使います。

画面下部に「MONSTER UPDATE 2026.09.12」と表示されれば新しいHTMLです。
古い表示なら Ctrl+Shift+R で再読み込みしてください。
画像が出ない場合は assets/game/enemies/ 内のPNG10枚を確認します。
既存の assets/monsters/ も削除不要です。

## GitHub Pagesへ反映する場合

元のプロジェクトで差分を確認してから、ゲーム関連だけをコミットします。

```bash
git diff --stat
git add battle.html src/battle-app.mjs src/game styles/game.css assets/game
git commit -m "Add animated monsters and species-specific battles"
git push
```

この更新パックの作成時点ではGitHubへの公開操作は行っていません。
Pagesのデプロイ完了後に公開ページを再読み込みしてください。

## 同梱ファイルと役割

- battle.html：ゲーム画面の入口
- src/battle-app.mjs：ゲームの起動と終了
- src/game/Game.mjs：レベル連携、選択、戦闘と保存の調整
- src/game/index.mjs：公開入口
- src/game/config.mjs：Canvasサイズ・プレイヤー素材設定
- src/game/bridge/todo-level.mjs：ToDoレベルの読み取り専用連携
- src/game/data/monsters.mjs：10種類の特徴・行動パターン・画像URL
- src/game/data/sprite-atlas.mjs：スプライトの各ポーズの範囲
- src/game/data/stages.mjs：敵レベルとステータス計算
- src/game/data/skills.mjs：プレイヤーの技
- src/game/battle/battle-controller.mjs：ターン進行・演出・勝敗判定
- src/game/battle/combat-rules.mjs：プレイヤー能力・敵の行動予測
- src/game/entities/actor.mjs：キャラクターの状態・フレーム切り替え
- src/game/rendering/canvas-renderer.mjs：背景・キャラクター・エフェクト描画
- src/game/core/asset-loader.mjs：画像読み込み
- src/game/core/audio.mjs：効果音
- src/game/core/game-loop.mjs：描画ループ
- src/game/core/tween.mjs：移動・待機アニメーション
- src/game/storage/game-storage.mjs：ゲーム専用の保存と旧データ引き継ぎ
- src/game/ui/game-ui.mjs：選択画面・技ボタン・HP・図鑑
- styles/game.css：ゲーム専用デザイン
- assets/game/player-adventurer-sheet.png：従来のプレイヤー素材
- assets/game/moonlit-arena.png：戦場背景
- assets/game/enemies/slime.png
- assets/game/enemies/goblin.png
- assets/game/enemies/wolf.png
- assets/game/enemies/skeleton.png
- assets/game/enemies/orc.png
- assets/game/enemies/demon.png
- assets/game/enemies/dragon.png
- assets/game/enemies/mimic.png
- assets/game/enemies/frost-golem.png
- assets/game/enemies/phoenix.png
- tests/game-quality.test.mjs：回帰テスト

## 確認結果と制限

自動テスト：25件。
ToDoの元ファイルのバイト一致、XP読み取り、ゲーム専用保存、選択、
10種類の戦闘、ガード・吸収・回復・怒り、連打ロック、勝利報酬一回、
スプライト範囲、画像ファイル、旧保存データを確認。

ローカルHTTPでES Modulesと画像の配信を確認。
この作業環境のブラウザはローカル接続を拒否したため、
実ブラウザでの見た目・スマートフォン操作・音声の確認は未完了です。

元のGitリポジトリに tests をコピーした場合：
```bash
node --test tests/game-quality.test.mjs
```
「ToDo非変更」テストにはGitのHEADと元のファイルが必要です。
本格的な難易度調整には実際のプレイを重ねてください。
