import { GAME_STORAGE_KEY, MAX_BATTLE_LEVEL } from "../config.mjs";
import { MONSTERS, normalizeMonsterId } from "../data/monsters.mjs";

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
    selectedMonster: "auto",
    defeatedMonsters: {},
  };
}

export function normalizeGameSave(rawSave) {
  const initial = createGameSave();
  if (!rawSave || typeof rawSave !== "object") return initial;

  return {
    selectedMonster: normalizeMonsterId(rawSave.selectedMonster),
    defeatedMonsters: Object.fromEntries(MONSTERS.map(monster => [monster.id,
      toNonNegativeInteger(rawSave.defeatedMonsters?.[monster.id])])),
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

export function loadGameSave(storage) {
  try {
    storage ??= globalThis.localStorage;
    if (!storage) return createGameSave();
    const stored = storage.getItem(GAME_STORAGE_KEY);
    return stored
      ? normalizeGameSave(JSON.parse(stored))
      : createGameSave();
  } catch (error) {
    console.warn("ゲームデータを読み込めませんでした", error);
    return createGameSave();
  }
}

export function saveGameSave(save, storage) {
  try {
    storage ??= globalThis.localStorage;
    if (!storage) return false;
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
