function toInteger(
  value,
  fallback = 0,
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? Math.floor(number)
    : fallback;
}

function toNonNegativeInteger(
  value,
  fallback = 0,
) {
  return Math.max(
    0,
    toInteger(
      value,
      fallback,
    ),
  );
}

function normalizeLog(
  rawLog,
) {
  if (!Array.isArray(rawLog)) {
    return [];
  }

  return rawLog
    .filter(
      (line) =>
        typeof line === "string",
    )
    .slice(-80);
}

function normalizeFighter(
  rawFighter,
  fallbackName,
) {
  if (
    !rawFighter ||
    typeof rawFighter !== "object"
  ) {
    return null;
  }

  const maxHp =
    Math.max(
      1,
      toNonNegativeInteger(
        rawFighter.maxHp,
        1,
      ),
    );

  const maxMp =
    toNonNegativeInteger(
      rawFighter.maxMp,
      0,
    );

  return {
    id:
      typeof rawFighter.id ===
      "string"
        ? rawFighter.id
        : "",

    name:
      typeof rawFighter.name ===
      "string"
        ? rawFighter.name
        : fallbackName,

    icon:
      typeof rawFighter.icon ===
      "string"
        ? rawFighter.icon
        : "",

    level:
      Math.max(
        1,
        toNonNegativeInteger(
          rawFighter.level,
          1,
        ),
      ),

    hp:
      Math.min(
        maxHp,
        toNonNegativeInteger(
          rawFighter.hp,
          maxHp,
        ),
      ),

    maxHp,

    mp:
      Math.min(
        maxMp,
        toNonNegativeInteger(
          rawFighter.mp,
          maxMp,
        ),
      ),

    maxMp,

    attack:
      Math.max(
        1,
        toNonNegativeInteger(
          rawFighter.attack,
          1,
        ),
      ),

    guarding:
      Boolean(
        rawFighter.guarding,
      ),
  };
}

function normalizeCurrentBattle(
  rawBattle,
) {
  if (
    !rawBattle ||
    typeof rawBattle !== "object"
  ) {
    return null;
  }

  const player =
    normalizeFighter(
      rawBattle.player,
      "YOU",
    );

  const enemy =
    normalizeFighter(
      rawBattle.enemy,
      "ENEMY",
    );

  if (!player || !enemy) {
    return null;
  }

  const allowedStatuses =
    new Set([
      "playing",
      "victory",
      "defeat",
    ]);

  const allowedPhases =
    new Set([
      "player",
      "enemy",
      "finished",
    ]);

  return {
    status:
      allowedStatuses.has(
        rawBattle.status,
      )
        ? rawBattle.status
        : "playing",

    phase:
      allowedPhases.has(
        rawBattle.phase,
      )
        ? rawBattle.phase
        : "player",

    turn:
      Math.max(
        1,
        toNonNegativeInteger(
          rawBattle.turn,
          1,
        ),
      ),

    battleLevel:
      Math.max(
        1,
        toNonNegativeInteger(
          rawBattle.battleLevel,
          1,
        ),
      ),

    goldReward:
      toNonNegativeInteger(
        rawBattle.goldReward,
        0,
      ),

    goldEarned:
      toNonNegativeInteger(
        rawBattle.goldEarned,
        0,
      ),

    player,
    enemy,

    log:
      normalizeLog(
        rawBattle.log,
      ),

    startedAt:
      typeof rawBattle.startedAt ===
      "string"
        ? rawBattle.startedAt
        : null,

    finishedAt:
      typeof rawBattle.finishedAt ===
      "string"
        ? rawBattle.finishedAt
        : null,
  };
}

export function createBattleInitialState() {
  return {
    gold: 0,
    wins: 0,
    losses: 0,
    highestClearedLevel: 0,
    selectedBattleLevel: 1,
    currentBattle: null,
  };
}

export function normalizeBattleState(
  rawBattle,
) {
  const initial =
    createBattleInitialState();

  if (
    !rawBattle ||
    typeof rawBattle !== "object"
  ) {
    return initial;
  }

  return {
    gold:
      toNonNegativeInteger(
        rawBattle.gold,
        0,
      ),

    wins:
      toNonNegativeInteger(
        rawBattle.wins,
        0,
      ),

    losses:
      toNonNegativeInteger(
        rawBattle.losses,
        0,
      ),

    highestClearedLevel:
      toNonNegativeInteger(
        rawBattle.highestClearedLevel,
        0,
      ),

    selectedBattleLevel:
      Math.max(
        1,
        toNonNegativeInteger(
          rawBattle.selectedBattleLevel,
          1,
        ),
      ),

    currentBattle:
      normalizeCurrentBattle(
        rawBattle.currentBattle,
      ),
  };
}

export function ensureBattleState(
  state,
) {
  if (
    !state ||
    typeof state !== "object"
  ) {
    throw new TypeError(
      "stateが正しくありません",
    );
  }

  state.battle =
    normalizeBattleState(
      state.battle,
    );

  return state.battle;
}