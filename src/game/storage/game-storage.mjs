import { GAME_STORAGE_KEY, MAX_BATTLE_LEVEL, CAMPAIGN_VERSION } from "../config.mjs";
import { MONSTERS } from "../data/monsters.mjs";

import { normalizeInventory } from "../data/equipment.mjs";

const integer = (v, fallback = 0) => Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : fallback;
export function createGameSave() {
  return { gold: 0, wins: 0, losses: 0, highestClearedLevel: 0, defeatedMonsters: {}, campaignVersion: CAMPAIGN_VERSION, clearedStage: 0, inventory: normalizeInventory(null) };
}
export function normalizeGameSave(raw) {
  if (!raw || typeof raw !== "object") return createGameSave();
  return {
    inventory: normalizeInventory(raw.inventory),
    gold: integer(raw.gold), wins: integer(raw.wins), losses: integer(raw.losses),
    highestClearedLevel: integer(raw.highestClearedLevel),
    defeatedMonsters: Object.fromEntries(MONSTERS.map(m => [m.id, integer(raw.defeatedMonsters?.[m.id])])),
    campaignVersion: CAMPAIGN_VERSION,
    // The old freely selected battle level does not prove the previous stages were cleared.
    clearedStage: raw.campaignVersion === CAMPAIGN_VERSION ? Math.min(MAX_BATTLE_LEVEL, integer(raw.clearedStage)) : 0,
  };
}
export function getCurrentStage(save) { return Math.min(MAX_BATTLE_LEVEL, normalizeGameSave(save).clearedStage + 1); }
export function isCampaignComplete(save) { return normalizeGameSave(save).clearedStage >= MAX_BATTLE_LEVEL; }
export function applyBattleResult(raw, result) {
  const save = normalizeGameSave(raw);
  if (save.clearedStage >= MAX_BATTLE_LEVEL || result.stageLevel !== save.clearedStage + 1) return { save, applied: false };
  if (result.status === "victory") {
    save.clearedStage = result.stageLevel;
    save.highestClearedLevel = Math.max(save.highestClearedLevel, result.stageLevel);
    save.gold += integer(result.goldReward); save.wins++;
    for (const id of result.monsterIds ?? []) if (MONSTERS.some(m => m.id === id)) save.defeatedMonsters[id] = (save.defeatedMonsters[id] || 0) + 1;
    return { save, applied: true };
  }
  if (result.status === "defeat") { save.losses++; return { save, applied: true }; }
  return { save, applied: false };
}
export function loadGameSave(storage) {
  try { storage ??= globalThis.localStorage; return normalizeGameSave(JSON.parse(storage?.getItem(GAME_STORAGE_KEY) || "null")); }
  catch { return createGameSave(); }
}
export function saveGameSave(save, storage) {
  try { storage ??= globalThis.localStorage; if (!storage) return false; storage.setItem(GAME_STORAGE_KEY, JSON.stringify(normalizeGameSave(save))); return true; }
  catch { return false; }
}
