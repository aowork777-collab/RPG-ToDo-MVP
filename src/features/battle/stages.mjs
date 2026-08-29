export const MAX_BATTLE_LEVEL = 99;

const ENEMY_TIERS = Object.freeze([
  Object.freeze({
    minLevel: 1,
    id: "slime",
    name: "スライム",
    icon: "🟢",
  }),

  Object.freeze({
    minLevel: 3,
    id: "goblin",
    name: "ゴブリン",
    icon: "👺",
  }),

  Object.freeze({
    minLevel: 5,
    id: "wolf",
    name: "ワイルドウルフ",
    icon: "🐺",
  }),

  Object.freeze({
    minLevel: 7,
    id: "skeleton",
    name: "スケルトン",
    icon: "💀",
  }),

  Object.freeze({
    minLevel: 10,
    id: "orc",
    name: "オーク",
    icon: "👹",
  }),

  Object.freeze({
    minLevel: 15,
    id: "demon",
    name: "デーモン",
    icon: "😈",
  }),

  Object.freeze({
    minLevel: 20,
    id: "dragon",
    name: "ドラゴン",
    icon: "🐉",
  }),
]);

function normalizeLevel(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 1;
  }

  return Math.max(
    1,
    Math.min(
      MAX_BATTLE_LEVEL,
      Math.floor(number),
    ),
  );
}

function getEnemyTier(level) {
  return ENEMY_TIERS.reduce(
    (selected, tier) => {
      return tier.minLevel <= level
        ? tier
        : selected;
    },
    ENEMY_TIERS[0],
  );
}

export function getBattleStage(level) {
  const battleLevel = normalizeLevel(level);
  const tier = getEnemyTier(battleLevel);

  return {
    level: battleLevel,

    enemyId: `${tier.id}-level-${battleLevel}`,

    enemyName: tier.name,

    enemyIcon: tier.icon,

    enemyMaxHp:
      45 +
      battleLevel * 16,

    enemyAttack:
      5 +
      battleLevel * 3,

    goldReward:
      5 +
      battleLevel * 4,
  };
}

/*
 * PLAYER LEVELに関係なく、
 * BATTLE LEVEL 1〜99を選択可能にします。
 */
export function getAvailableBattleLevels() {
  return Array.from(
    {
      length: MAX_BATTLE_LEVEL,
    },
    (_, index) => index + 1,
  );
}

/*
 * 選択されたバトルレベルを
 * 1〜MAX_BATTLE_LEVELの範囲に調整します。
 */
export function clampBattleLevel(requestedLevel) {
  return normalizeLevel(requestedLevel);
}