import { MAX_BATTLE_LEVEL } from "../config.mjs";

function monsterImage(fileName) {
  return new URL(
    `../../../assets/monsters/${fileName}`,
    import.meta.url,
  ).href;
}

const ENEMY_TIERS = Object.freeze([
  Object.freeze({
    minLevel: 1,
    id: "slime",
    name: "スライム",
    imageUrl: monsterImage("slime.webp"),
    fallback: "🟢",
    colors: ["#142b24", "#071512"],
  }),
  Object.freeze({
    minLevel: 3,
    id: "goblin",
    name: "ゴブリン",
    imageUrl: monsterImage("goblin.webp"),
    fallback: "👺",
    colors: ["#2a2613", "#151107"],
  }),
  Object.freeze({
    minLevel: 5,
    id: "wolf",
    name: "ワイルドウルフ",
    imageUrl: monsterImage("wolf.webp"),
    fallback: "🐺",
    colors: ["#172638", "#080f18"],
  }),
  Object.freeze({
    minLevel: 7,
    id: "skeleton",
    name: "スケルトン",
    imageUrl: monsterImage("skeleton.webp"),
    fallback: "💀",
    colors: ["#2c2233", "#110c16"],
  }),
  Object.freeze({
    minLevel: 10,
    id: "orc",
    name: "オーク",
    imageUrl: monsterImage("orc.webp"),
    fallback: "👹",
    colors: ["#34221c", "#170c09"],
  }),
  Object.freeze({
    minLevel: 15,
    id: "demon",
    name: "デーモン",
    imageUrl: monsterImage("demon.webp"),
    fallback: "😈",
    colors: ["#35151f", "#16070c"],
  }),
  Object.freeze({
    minLevel: 20,
    id: "dragon",
    name: "ドラゴン",
    imageUrl: monsterImage("dragon.webp"),
    fallback: "🐉",
    colors: ["#321c16", "#110807"],
  }),
]);

export function clampStageLevel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.min(MAX_BATTLE_LEVEL, Math.floor(number)));
}

function getTier(level) {
  return ENEMY_TIERS.reduce(
    (selected, tier) => (tier.minLevel <= level ? tier : selected),
    ENEMY_TIERS[0],
  );
}

export function getStage(level) {
  const stageLevel = clampStageLevel(level);
  const tier = getTier(stageLevel);

  return {
    level: stageLevel,
    id: `${tier.id}-level-${stageLevel}`,
    enemyId: tier.id,
    enemyName: tier.name,
    enemyImageUrl: tier.imageUrl,
    enemyFallback: tier.fallback,
    backgroundColors: tier.colors,
    enemyMaxHp: 45 + stageLevel * 16,
    enemyAttack: 5 + stageLevel * 3,
    goldReward: 5 + stageLevel * 4,
  };
}

export function getStageLevels() {
  return Array.from({ length: MAX_BATTLE_LEVEL }, (_, index) => index + 1);
}

export function getAllEnemyImageUrls() {
  return [...new Set(ENEMY_TIERS.map((tier) => tier.imageUrl))];
}
