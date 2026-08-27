function toNonNegativeInteger(
  value,
  fallback = 0,
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(
    0,
    Math.floor(number),
  );
}

function normalizeBattleLog(rawLog) {
  if (!Array.isArray(rawLog)) {
    return [];
  }

  return rawLog
    .filter(
      (line) =>
        typeof line === "string",
    )
    .slice(0, 60);
}

function normalizeLastResult(
  rawResult,
) {
  if (
    !rawResult ||
    typeof rawResult !== "object"
  ) {
    return null;
  }

  return {
    victory:
      Boolean(rawResult.victory),

    enemyId:
      typeof rawResult.enemyId ===
      "string"
        ? rawResult.enemyId
        : "",

    enemyName:
      typeof rawResult.enemyName ===
      "string"
        ? rawResult.enemyName
        : "UNKNOWN",

    enemyIcon:
      typeof rawResult.enemyIcon ===
      "string"
        ? rawResult.enemyIcon
        : "👾",

    enemyLevel:
      Math.max(
        1,
        toNonNegativeInteger(
          rawResult.enemyLevel,
          1,
        ),
      ),

    playerLevel:
      Math.max(
        1,
        toNonNegativeInteger(
          rawResult.playerLevel,
          1,
        ),
      ),

    playerMaxHp:
      toNonNegativeInteger(
        rawResult.playerMaxHp,
      ),

    playerHpRemaining:
      toNonNegativeInteger(
        rawResult.playerHpRemaining,
      ),

    enemyMaxHp:
      toNonNegativeInteger(
        rawResult.enemyMaxHp,
      ),

    enemyHpRemaining:
      toNonNegativeInteger(
        rawResult.enemyHpRemaining,
      ),

    turns:
      toNonNegativeInteger(
        rawResult.turns,
      ),

    goldEarned:
      toNonNegativeInteger(
        rawResult.goldEarned,
      ),

    log:
      normalizeBattleLog(
        rawResult.log,
      ),

    foughtAt:
      typeof rawResult.foughtAt ===
      "string"
        ? rawResult.foughtAt
        : null,
  };
}

export function createBattleInitialState() {
  return {
    gold: 0,
    wins: 0,
    losses: 0,
    lastResult: null,
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
      ),

    wins:
      toNonNegativeInteger(
        rawBattle.wins,
      ),

    losses:
      toNonNegativeInteger(
        rawBattle.losses,
      ),

    lastResult:
      normalizeLastResult(
        rawBattle.lastResult,
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