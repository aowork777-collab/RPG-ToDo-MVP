export const ENEMIES = Object.freeze([
  Object.freeze({
    id: "slime",
    name: "スライム",
    icon: "🟢",
    level: 1,
    hpBonus: 0,
    attackBonus: 0,
    goldReward: 8,
  }),

  Object.freeze({
    id: "goblin",
    name: "ゴブリン",
    icon: "👺",
    level: 3,
    hpBonus: 8,
    attackBonus: 2,
    goldReward: 14,
  }),

  Object.freeze({
    id: "wolf",
    name: "ワイルドウルフ",
    icon: "🐺",
    level: 5,
    hpBonus: 15,
    attackBonus: 3,
    goldReward: 20,
  }),

  Object.freeze({
    id: "orc",
    name: "オーク",
    icon: "👹",
    level: 10,
    hpBonus: 30,
    attackBonus: 5,
    goldReward: 35,
  }),

  Object.freeze({
    id: "dragon",
    name: "ドラゴン",
    icon: "🐉",
    level: 20,
    hpBonus: 80,
    attackBonus: 10,
    goldReward: 80,
  }),
]);

function normalizeLevel(level) {
  const number = Number(level);

  if (!Number.isFinite(number)) {
    return 1;
  }

  return Math.max(
    1,
    Math.floor(number),
  );
}

export function getEnemyById(
  enemyId,
) {
  return (
    ENEMIES.find(
      (enemy) =>
        enemy.id === enemyId,
    ) ?? null
  );
}

export function getUnlockedEnemies(
  playerLevel,
) {
  const level =
    normalizeLevel(playerLevel);

  return ENEMIES.filter(
    (enemy) =>
      enemy.level <= level,
  );
}

export function selectEnemyForLevel(
  playerLevel,
  requestedEnemyId = null,
) {
  const unlocked =
    getUnlockedEnemies(
      playerLevel,
    );

  if (requestedEnemyId) {
    const requested =
      getEnemyById(
        requestedEnemyId,
      );

    if (
      requested &&
      unlocked.some(
        (enemy) =>
          enemy.id === requested.id,
      )
    ) {
      return requested;
    }
  }

  return (
    unlocked.at(-1) ??
    ENEMIES[0]
  );
}