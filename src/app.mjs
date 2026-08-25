import {
  addTask,
  promoteTaskToBoss,
  removeTask,
  toggleTaskState,
} from "./actions.mjs";
import { createDefaultState } from "./model.mjs";
import { loadState, saveState } from "./storage.mjs";
import { renderBoss } from "./ui/boss.mjs";
import {
  closeQuestDialog,
  openQuestDialog,
  updateRewardPreview,
} from "./ui/dialog.mjs";
import { announce, showLevelUp, showToast } from "./ui/feedback.mjs";
import { setText } from "./ui/helpers.mjs";
import { renderProfile } from "./ui/profile.mjs";
import { renderFilters, renderQuestList } from "./ui/quests.mjs";

let state = createDefaultState();
let elements = {};

function persist() {
  const result = saveState(state);
  if (!result.ok) {
    showToast(elements, "保存できませんでした", "ブラウザの保存設定を確認してください", "!");
  }
}

function render() {
  const actions = {
    toggleTask: handleToggleTask,
    setBoss: handleSetBoss,
    deleteTask: handleDeleteTask,
    openQuest: handleOpenQuest,
  };
  renderProfile(elements, state);
  renderBoss(elements, state, actions);
  renderQuestList(elements, state, actions);
  renderFilters(elements, state);
}

function handleToggleTask(taskId) {
  const result = toggleTaskState(state, taskId);
  if (!result) return;

  persist();
  render();

  if (!result.completed) {
    announce(elements, `${result.task.title}を未完了に戻しました`);
    showToast(elements, "クエストを未完了に戻しました", `${result.xpDelta} XP`, "↺");
    return;
  }

  announce(elements, `${result.task.title}を完了。${result.xpDelta}経験値を獲得しました`);
  showToast(
    elements,
    result.wasBoss ? "BOSS DEFEATED!" : "QUEST COMPLETE!",
    `+${result.xpDelta} XP`,
    result.wasBoss ? "!" : "✓",
  );

  if (result.newLevel > result.oldLevel) showLevelUp(elements, result.newLevel);
}

function handleSetBoss(taskId) {
  const selected = promoteTaskToBoss(state, taskId);
  if (!selected) return;

  persist();
  render();
  announce(elements, `${selected.title}を今日のボスに設定しました`);
  showToast(elements, "TODAY'S BOSS を更新", selected.title, "!");
  document.getElementById("bossSectionTitle").scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleDeleteTask(taskId) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task || !window.confirm(`「${task.title}」をクエストログから削除しますか？`)) return;

  removeTask(state, taskId);
  persist();
  render();
  announce(elements, `${task.title}を削除しました`);
  showToast(elements, "クエストを削除しました", task.title, "×");
}

function handleAddTask(formData) {
  const task = addTask(state, {
    title: formData.get("title"),
    difficulty: formData.get("difficulty"),
    dueTime: formData.get("dueTime"),
    isBoss: formData.get("isBoss") === "on",
  });
  if (!task) return;

  persist();
  render();
  closeQuestDialog(elements);
  announce(elements, `${task.title}を追加しました`);
  showToast(
    elements,
    task.isBoss ? "新しいボスが出現" : "クエストを追加しました",
    `${task.title} / +${task.reward} XP`,
    task.isBoss ? "!" : "+",
  );
}

function handleOpenQuest(asBoss = false) {
  openQuestDialog(elements, asBoss);
}

function handleReset() {
  if (!window.confirm("レベルとクエストを最初のデモ状態に戻しますか？")) return;
  state = createDefaultState();
  persist();
  render();
  showToast(elements, "デモデータに戻しました", "LEVEL 12 / 68 XP", "↺");
}

function cacheElements() {
  elements = {
    todayLabel: document.getElementById("todayLabel"),
    levelNumber: document.getElementById("levelNumber"),
    xpCurrent: document.getElementById("xpCurrent"),
    xpTrack: document.getElementById("xpTrack"),
    xpBar: document.getElementById("xpBar"),
    nextLevelCopy: document.getElementById("nextLevelCopy"),
    activeQuestCount: document.getElementById("activeQuestCount"),
    completedQuestCount: document.getElementById("completedQuestCount"),
    bossContainer: document.getElementById("bossContainer"),
    questList: document.getElementById("questList"),
    filterTabs: Array.from(document.querySelectorAll(".filter-tab")),
    openQuestButton: document.getElementById("openQuestButton"),
    resetButton: document.getElementById("resetButton"),
    questDialog: document.getElementById("questDialog"),
    questForm: document.getElementById("questForm"),
    questTitle: document.getElementById("questTitle"),
    makeBoss: document.getElementById("makeBoss"),
    rewardPreview: document.getElementById("rewardPreview"),
    closeDialogButton: document.getElementById("closeDialogButton"),
    cancelDialogButton: document.getElementById("cancelDialogButton"),
    toastStack: document.getElementById("toastStack"),
    levelFlash: document.getElementById("levelFlash"),
    levelFlashNumber: document.getElementById("levelFlashNumber"),
    confettiLayer: document.getElementById("confettiLayer"),
    liveRegion: document.getElementById("liveRegion"),
  };
}

function bindEvents() {
  elements.openQuestButton.addEventListener("click", () => handleOpenQuest(false));
  elements.resetButton.addEventListener("click", handleReset);
  elements.closeDialogButton.addEventListener("click", () => closeQuestDialog(elements));
  elements.cancelDialogButton.addEventListener("click", () => closeQuestDialog(elements));
  elements.questForm.addEventListener("change", () => updateRewardPreview(elements));
  elements.questForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleAddTask(new FormData(elements.questForm));
  });
  elements.questDialog.addEventListener("click", (event) => {
    if (event.target === elements.questDialog) closeQuestDialog(elements);
  });
  elements.filterTabs.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      persist();
      renderQuestList(elements, state, {
        toggleTask: handleToggleTask,
        setBoss: handleSetBoss,
        deleteTask: handleDeleteTask,
      });
      renderFilters(elements, state);
    });
  });
}

function init() {
  cacheElements();
  state = loadState();
  const today = new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
  setText(elements.todayLabel, today);
  bindEvents();
  render();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
