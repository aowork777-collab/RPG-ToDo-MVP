import { getProgress } from "../model.mjs";
import { setText } from "./helpers.mjs";

export function renderProfile(elements, state) {
  const progress = getProgress(state.totalXp);
  const active = state.tasks.filter((task) => !task.completed).length;
  const completed = state.tasks.filter((task) => task.completed).length;

  setText(elements.levelNumber, progress.level);
  setText(elements.xpCurrent, progress.currentXp);
  setText(elements.nextLevelCopy, `あと ${progress.remainingXp} XP で LEVEL ${progress.nextLevel}`);
  setText(elements.activeQuestCount, active);
  setText(elements.completedQuestCount, completed);
  elements.xpBar.style.width = `${progress.percent}%`;
  elements.xpTrack.setAttribute("aria-valuenow", String(progress.currentXp));
  elements.xpTrack.setAttribute(
    "aria-valuetext",
    `レベル${progress.level}、次のレベルまであと${progress.remainingXp}経験値`,
  );
}
