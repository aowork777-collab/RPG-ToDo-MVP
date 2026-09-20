import { CHAPTERS, relicBonuses } from "../data/chapters.mjs";
import { GAME_SKILLS } from "../data/skills.mjs";
import { MONSTERS } from "../data/monsters.mjs";
import { loadGameSave } from "../storage/game-storage.mjs";
import { el, link, panel } from "../../features/habits/dom.mjs";

export function renderAdventure(root, playerLevel) {
  const save = loadGameSave(), relics = relicBonuses(save.clearedStage);
  const next = Math.min(100, save.clearedStage + 1), current = CHAPTERS.find(chapter => next <= chapter.last);
  const overview = panel(save.clearedStage === 100 ? "星天の遠征を制覇しました" : `第${current.id}章 · ${current.name}`, `プレイヤーレベル ${playerLevel} · ${save.clearedStage} / 100 ステージ制覇 · ${save.gold} ゴールド`);
  overview.append(el("p", "muted", "ステージはクリア順に進み、5ステージごとにボスが出現します。章を制覇すると星の遺物が育ち、次の戦闘から強化されます。"), link(save.clearedStage === 100 ? "冒険の記録・装備を見る" : `ステージ ${next} に挑戦する →`, "./battle.html", "hub-button primary")); root.append(overview);
  const chapters = el("div", "adventure-chapters");
  for (const chapter of CHAPTERS) {
    const done = save.clearedStage >= chapter.last, active = !done && next >= chapter.first, card = el("article", `chapter-card ${done ? "complete" : active ? "current" : "locked"}`);
    card.style.setProperty("--chapter-color", chapter.color);
    card.append(el("span", "chapter-mark", chapter.icon), el("p", "chapter-status", `第${chapter.id}章 · ${done ? "制覇" : active ? "冒険中" : "未到達"}`), el("h2", "", chapter.name), el("p", "", chapter.story));
    const route = el("div", "chapter-stages"); route.setAttribute("aria-label", `ステージ${chapter.first}〜${chapter.last}`);
    for (let level = chapter.first; level <= chapter.last; level++) {const dot = el("span", `${level <= save.clearedStage ? "cleared" : ""}${level % 5 === 0 ? " boss" : ""}`); dot.title = `ステージ ${level}${level % 5 === 0 ? " ボス" : ""}`; route.append(dot);}
    card.append(route, el("strong", "", done ? "✓ 遺物の力を獲得" : `ステージ ${chapter.last} 制覇で 攻撃+2 / HP+5`)); chapters.append(card);
  }
  root.append(chapters);
  const growth = panel("成長する技と遺物", `星の遺物 ${relics.relics} / 10 · 攻撃 +${relics.attack} / HP +${relics.hp}（装備の効果と加算）`);
  growth.style.marginTop = "24px"; const skills = el("div", "mastery-list");
  for (const skill of GAME_SKILLS) { const unlocked = playerLevel >= (skill.unlockLevel || 1), card = el("article", unlocked ? "unlocked" : ""); card.append(el("h3", "", skill.subtitle), el("p", "", skill.description), el("small", "", unlocked ? "✓ 使用可能" : `ToDoで LEVEL ${skill.unlockLevel} になると解放`)); skills.append(card); }
  growth.append(skills); root.append(growth);
  const codex = panel("モンスター図鑑", "討伐した敵を記録。3回倒すと、その魔物に詳しい研究者になります。"), creatures = el("div", "mastery-list");
  for (const monster of MONSTERS) {const count = save.defeatedMonsters[monster.id] || 0, card = el("article", count >= 3 ? "unlocked" : ""); card.append(el("h3", "", `${count ? monster.icon : "◇"} ${count ? monster.name : "未発見の魔物"}`), el("p", "", count ? monster.region : "遠征を進めて出会おう"), el("small", "", count ? `討伐 ${count} 回 · ${count >= 3 ? "研究完了" : `研究完了まで ${3 - count} 回`}` : "未発見")); creatures.append(card); }
  codex.append(creatures); root.append(codex);
}
