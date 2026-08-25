import { calculateTaskReward, clampDifficulty } from "../model.mjs";
import { setText } from "./helpers.mjs";

export function updateRewardPreview(elements) {
  const difficulty = clampDifficulty(elements.questForm.elements.difficulty.value);
  const reward = calculateTaskReward(difficulty, elements.makeBoss.checked);
  setText(elements.rewardPreview, `+${reward} XP`);
}

export function openQuestDialog(elements, asBoss) {
  elements.questForm.reset();
  elements.questForm.elements.difficulty.value = "2";
  elements.makeBoss.checked = Boolean(asBoss);
  updateRewardPreview(elements);

  if (typeof elements.questDialog.showModal === "function") {
    elements.questDialog.showModal();
  } else {
    elements.questDialog.setAttribute("open", "");
  }
  window.setTimeout(() => elements.questTitle.focus(), 0);
}

export function closeQuestDialog(elements) {
  if (typeof elements.questDialog.close === "function") {
    elements.questDialog.close();
  } else {
    elements.questDialog.removeAttribute("open");
  }
}
