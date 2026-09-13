import { existsSync, statSync, readdirSync, mkdirSync, copyFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const source = path.dirname(fileURLToPath(import.meta.url));
const requested = process.argv[2];
function fail(message) { console.error(message); process.exit(1); }
if (!requested) fail("元のプロジェクトを指定してください。例：node INSTALL-GAME.mjs /home/harustoko/work/RPG-ToDo-MVP");
if (!existsSync(requested)) fail("指定したプロジェクトが見つかりません：" + requested);
const target = realpathSync(requested);
if (realpathSync(source) === target) fail("更新パックを別フォルダに展開してから、元のRPG-ToDo-MVPを指定してください。");
for (const relative of ["index.html", "server.js", "src/app.mjs", "src/model.mjs", "src/storage.mjs"]) {
  if (!existsSync(path.join(target, relative))) fail("元のプロジェクトを確認できません。不足：" + relative + "（変更はまだ行っていません）");
}
const entries = ["battle.html", "src/battle-app.mjs", "src/game", "styles/game.css", "assets/game"];
const files = [];
function collect(relative) {
  const full = path.join(source, relative);
  if (!existsSync(full)) fail("更新パックのファイルが不足しています：" + relative);
  if (statSync(full).isDirectory()) for (const name of readdirSync(full)) collect(path.join(relative,name));
  else files.push(relative);
}
entries.forEach(collect);
const stamp = new Date().toISOString().replace(/[:.]/g,"-");
const backup = path.join(path.dirname(target), path.basename(target) + "-game-backup-" + stamp);
mkdirSync(backup, { recursive:false });
// Back up every overwritten file before the first overwrite.
for (const relative of files) {
  const existing = path.join(target,relative);
  if (existsSync(existing)) {
    const saved = path.join(backup,relative); mkdirSync(path.dirname(saved),{recursive:true}); copyFileSync(existing,saved);
  }
}
for (const relative of files) {
  const dest = path.join(target,relative); mkdirSync(path.dirname(dest),{recursive:true}); copyFileSync(path.join(source,relative),dest);
}
console.log("ゲームの更新が完了しました：" + target);
console.log("上書き前のゲームファイル：" + backup);
console.log("ToDoのHTML・コード・保存データは変更していません。");
console.log("元のプロジェクトで node server.js を実行し、battle.html を再読み込みしてください。");
