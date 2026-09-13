import { MAX_BATTLE_LEVEL } from "../config.mjs";
import { MONSTERS, getMonster, defaultMonster } from "./monsters.mjs";

export function clampStageLevel(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.min(MAX_BATTLE_LEVEL, Math.floor(number))) : 1;
}
export function getStage(level, monsterId = "auto") {
  const stageLevel = clampStageLevel(level);
  const monster = getMonster(monsterId) ?? defaultMonster(stageLevel);
  return {
    level: stageLevel, id: monster.id + "-level-" + stageLevel,
    enemyId: monster.id, enemyName: monster.name, enemyImageUrl: monster.imageUrl,
    enemyFallback: monster.icon, enemySprite: monster.sprite, enemySize: monster.size,
    region: monster.region, monster,
    backgroundColors: ["#172638", "#080f18"],
    enemyMaxHp: Math.floor((45 + stageLevel * 16) * monster.hp),
    enemyAttack: Math.floor((5 + stageLevel * 3) * monster.attack),
    goldReward: Math.floor((5 + stageLevel * 4) * monster.gold),
  };
}
export function getStageLevels() { return Array.from({ length: MAX_BATTLE_LEVEL }, (_, index) => index + 1); }
export function getAllEnemyImageUrls() { return MONSTERS.map(monster => monster.imageUrl); }
