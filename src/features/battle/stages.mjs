export const MAX_BATTLE_LEVEL = 99;

/*
 * stages.mjsからassets/monstersまでの
 * 安全なURLを生成します。
 *
 * GitHub Pagesのサブディレクトリ公開にも対応します。
 */
function getMonsterImageUrl(fileName) {
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
    icon: "🟢",

    media: Object.freeze({
      type: "image",
      src: getMonsterImageUrl(
        "slime.webp",
      ),
      alt: "スライム",
    }),
  }),

  Object.freeze({
    minLevel: 3,
    id: "goblin",
    name: "ゴブリン",
    icon: "👺",

    media: Object.freeze({
      type: "image",
      src: getMonsterImageUrl(
        "goblin.webp",
      ),
      alt: "ゴブリン",
    }),
  }),

  Object.freeze({
    minLevel: 5,
    id: "wolf",
    name: "ワイルドウルフ",
    icon: "🐺",

    media: Object.freeze({
      type: "image",
      src: getMonsterImageUrl(
        "wolf.webp",
      ),
      alt: "ワイルドウルフ",
    }),
  }),

  Object.freeze({
    minLevel: 7,
    id: "skeleton",
    name: "スケルトン",
    icon: "💀",

    media: Object.freeze({
      type: "image",
      src: getMonsterImageUrl(
        "skeleton.webp",
      ),
      alt: "スケルトン",
    }),
  }),

  Object.freeze({
    minLevel: 10,
    id: "orc",
    name: "オーク",
    icon: "👹",

    media: Object.freeze({
      type: "image",
      src: getMonsterImageUrl(
        "orc.webp",
      ),
      alt: "オーク",
    }),
  }),

  Object.freeze({
    minLevel: 15,
    id: "demon",
    name: "デーモン",
    icon: "😈",

    media: Object.freeze({
      type: "image",
      src: getMonsterImageUrl(
        "demon.webp",
      ),
      alt: "デーモン",
    }),
  }),

  Object.freeze({
    minLevel: 20,
    id: "dragon",
    name: "ドラゴン",
    icon: "🐉",

    media: Object.freeze({
      type: "image",
      src: getMonsterImageUrl(
        "dragon.webp",
      ),
      alt: "ドラゴン",
    }),
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
  const battleLevel =
    normalizeLevel(level);

  const tier =
    getEnemyTier(
      battleLevel,
    );

  return {
    level: battleLevel,

    enemyId:
      `${tier.id}-level-${battleLevel}`,

    enemyName:
      tier.name,

    /*
     * 画像を読み込めない場合の
     * フォールバック用アイコン
     */
    enemyIcon:
      tier.icon,

    /*
     * 画像または動画の情報
     */
    enemyMedia:
      tier.media,

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
 * BATTLE LEVEL 1〜99を選択できます。
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
 * 1〜99の範囲に調整します。
 */
export function clampBattleLevel(
  requestedLevel,
) {
  return normalizeLevel(
    requestedLevel,
  );
}