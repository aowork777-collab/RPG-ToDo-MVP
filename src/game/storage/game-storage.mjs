import { GAME_STORAGE_KEY, MAX_BATTLE_LEVEL } from "../config.mjs";

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(0, Math.floor(number))
    : fallback;
}

export function createGameSave() {
  return {
    gold: 0,
    wins: 0,
    losses: 0,
    highestClearedLevel: 0,
    selectedStage: 1,
  };
}

export function normalizeGameSave(rawSave) {
  const initial = createGameSave();
  if (!rawSave || typeof rawSave !== "object") return initial;

  return {
    gold: toNonNegativeInteger(rawSave.gold),
    wins: toNonNegativeInteger(rawSave.wins),
    losses: toNonNegativeInteger(rawSave.losses),
    highestClearedLevel: Math.min(
      MAX_BATTLE_LEVEL,
      toNonNegativeInteger(rawSave.highestClearedLevel),
    ),
    selectedStage: Math.max(
      1,
      Math.min(
        MAX_BATTLE_LEVEL,
        toNonNegativeInteger(rawSave.selectedStage, 1),
      ),
    ),
  };
}

export function loadGameSave(storage = globalThis.localStorage) {
  if (!storage) return createGameSave();

  try {
    const stored = storage.getItem(GAME_STORAGE_KEY);
    return stored
      ? normalizeGameSave(JSON.parse(stored))
      : createGameSave();
  } catch (error) {
    console.warn("ゲームデータを読み込めませんでした", error);
    return createGameSave();
  }
}

export function saveGameSave(save, storage = globalThis.localStorage) {
  if (!storage) return false;

  try {
    storage.setItem(
      GAME_STORAGE_KEY,
      JSON.stringify(normalizeGameSave(save)),
    );
    return true;
  } catch (error) {
    console.warn("ゲームデータを保存できませんでした", error);
    return false;
  }
}
