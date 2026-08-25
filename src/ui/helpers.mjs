import { clampDifficulty } from "../model.mjs";

export function difficultyStars(difficulty) {
  const safe = clampDifficulty(difficulty);
  return `${"★".repeat(safe)}${"☆".repeat(5 - safe)}`;
}

export function formatDueTime(dueTime) {
  return dueTime ? `今日 ${dueTime}` : "期限なし";
}

export function setText(element, value) {
  if (element) element.textContent = String(value);
}
