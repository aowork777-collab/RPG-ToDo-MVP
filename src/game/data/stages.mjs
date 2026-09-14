import { MAX_BATTLE_LEVEL, BOSS_INTERVAL } from "../config.mjs";
import { getMonster } from "./monsters.mjs";

export function clampStageLevel(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(MAX_BATTLE_LEVEL, Math.floor(n))) : 1;
}
const regular = ["slime", "goblin", "wolf", "skeleton", "mimic", "demon"];
const bosses = ["orc", "frost-golem", "dragon", "phoenix"];

export function getStage(value) {
  const level = clampStageLevel(value);
  const isBoss = level % BOSS_INTERVAL === 0;
  const chapter = Math.floor((level - 1) / BOSS_INTERVAL) + 1;
  const count = isBoss ? 1 : level >= 13 && level % 3 === 0 ? 3 : level >= 7 && level % 2 === 0 ? 2 : 1;
  const enemies = Array.from({ length: count }, (_, index) => {
    const id = isBoss ? bosses[(chapter - 1) % bosses.length] : regular[(level - 1 + index * 2) % regular.length];
    const monster = getMonster(id);
    // Group encounters share a health/damage budget, rather than multiplying difficulty by enemy count.
    const hp = Math.floor((42 + level * 13) * (isBoss ? 1.55 : count === 1 ? 1 : count === 2 ? .66 : .48) * monster.hp);
    const attack = Math.max(1, Math.floor((4 + level * 2.2) * (isBoss ? 1.1 : count === 1 ? 1 : count === 2 ? .6 : .45) * monster.attack));
    return {
      id: id + "-" + index, monsterId: id, monster, name: monster.name, level, isBoss,
      maxHp: hp, attack, speed: isBoss ? 95 : 88 + index * 7,
      imageUrl: monster.imageUrl, sprite: monster.sprite,
      size: isBoss ? 290 : count > 1 ? 175 : monster.size,
    };
  });
  return {
    id: "expedition-" + level, level, chapter, isBoss, enemies,
    title: isBoss ? "守護者との決戦" : "星影の遠征",
    region: enemies[0].monster.region,
    goldReward: Math.floor((5 + level * 4) * (isBoss ? 2 : 1)),
    nextBoss: Math.min(MAX_BATTLE_LEVEL, Math.ceil(level / BOSS_INTERVAL) * BOSS_INTERVAL),
    backgroundColors: ["#172638", "#080f18"],
  };
}
