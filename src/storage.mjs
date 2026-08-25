import { STORAGE_KEY } from "./config.mjs";
import { createDefaultState, normalizeState } from "./model.mjs";

export function loadState(storage = globalThis.localStorage) {
  if (!storage) return createDefaultState();
  try {
    const stored = storage.getItem(STORAGE_KEY);
    return stored ? normalizeState(JSON.parse(stored)) : createDefaultState();
  } catch (error) {
    console.warn("Saved quest data could not be loaded.", error);
    return createDefaultState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  if (!storage) return { ok: false, error: new Error("Storage is unavailable.") };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true, error: null };
  } catch (error) {
    console.warn("Quest data could not be saved.", error);
    return { ok: false, error };
  }
}
