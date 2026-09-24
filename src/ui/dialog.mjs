import {
  calculateTaskReward,
  clampDifficulty,
} from "../model.mjs";

import { setText } from "./helpers.mjs";

export function updateRewardPreview(elements) {
  const options = elements.questForm.querySelector("[data-schedule-options]");
  if (options) {
    options.hidden = !elements.repeatDaily?.checked;
    const kind = elements.questForm.elements.scheduleKind.value;
    options.querySelectorAll("[data-kind]").forEach(group => {
      group.hidden = group.dataset.kind !== kind;
      group.querySelectorAll("input").forEach(input => {input.disabled = options.hidden || group.hidden;});
    });
  }
  elements.questForm.querySelectorAll("[data-single-task]").forEach(input => { input.disabled = Boolean(elements.repeatDaily?.checked); });
  const difficulty = clampDifficulty(
    elements.questForm.elements.difficulty.value,
  );

  const reward = calculateTaskReward(difficulty);

  setText(
    elements.rewardPreview,
    `+${reward} XP`,
  );
}

export function openQuestDialog(elements) {
  elements.questForm.reset();

  elements.questForm.elements.difficulty.value = "2";

  updateRewardPreview(elements);

  if (
    typeof elements.questDialog.showModal === "function"
  ) {
    elements.questDialog.showModal();
  } else {
    elements.questDialog.setAttribute("open", "");
  }

  window.setTimeout(() => {
    elements.questTitle.focus();
  }, 0);
}

export function closeQuestDialog(elements) {
  if (
    typeof elements.questDialog.close === "function"
  ) {
    elements.questDialog.close();
  } else {
    elements.questDialog.removeAttribute("open");
  }
}
