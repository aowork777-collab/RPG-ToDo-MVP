import { getProgress } from "../../model.mjs";
import { loadState } from "../../storage.mjs";

export function readTodoProgress() {
  const todoState = loadState();
  const progress = getProgress(todoState.totalXp);

  return {
    totalXp: Math.max(0, Number(todoState.totalXp) || 0),
    level: Math.max(1, Number(progress.level) || 1),
    currentXp: Math.max(0, Number(progress.currentXp) || 0),
  };
}
