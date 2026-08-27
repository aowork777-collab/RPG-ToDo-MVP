import {
  addTask,
  removeTask,
  toggleTaskState,
} from "./actions.mjs";

import {
  renderBattle,
  startBattle,
} from "./features/battle/index.mjs";

import {
  addDailyTemplate,
  generateTodayTasks,
  removeDailyTemplate,
  renderDailyList,
  startDailyScheduler,
  toggleDailyTemplate,
} from "./features/daily/index.mjs";

import {
  createDefaultState,
} from "./model.mjs";

import {
  loadState,
  saveState,
} from "./storage.mjs";

import {
  closeQuestDialog,
  openQuestDialog,
  updateRewardPreview,
} from "./ui/dialog.mjs";

import {
  announce,
  showLevelUp,
  showToast,
} from "./ui/feedback.mjs";

import {
  setText,
} from "./ui/helpers.mjs";

import {
  renderProfile,
} from "./ui/profile.mjs";

import {
  renderFilters,
  renderQuestList,
} from "./ui/quests.mjs";

let state = createDefaultState();
let elements = {};

function persist() {
  const result = saveState(state);

  if (!result.ok) {
    showToast(
      elements,
      "保存できませんでした",
      "ブラウザの保存設定を確認してください",
      "!",
    );
  }

  return result;
}

function updateTodayLabel() {
  const today =
    new Intl.DateTimeFormat(
      "ja-JP",
      {
        month: "long",
        day: "numeric",
        weekday: "short",
      },
    ).format(new Date());

  setText(
    elements.todayLabel,
    today,
  );
}

function render() {
  const questActions = {
    toggleTask:
      handleToggleTask,

    deleteTask:
      handleDeleteTask,

    openQuest:
      handleOpenQuest,
  };

  renderProfile(
    elements,
    state,
  );

  renderDailyList(
    elements,
    state,
    {
      openCreate:
        handleOpenDailyQuest,

      toggleTemplate:
        handleToggleDailyTemplate,

      deleteTemplate:
        handleDeleteDailyTemplate,
    },
  );

  renderQuestList(
    elements,
    state,
    questActions,
  );

  renderBattle(
    elements,
    state,
    {
      startBattle:
        handleStartBattle,
    },
  );

  renderFilters(
    elements,
    state,
  );
}

function handleToggleTask(
  taskId,
) {
  const result =
    toggleTaskState(
      state,
      taskId,
    );

  if (!result) {
    return;
  }

  persist();
  render();

  if (!result.completed) {
    announce(
      elements,
      `${result.task.title}を未完了に戻しました`,
    );

    showToast(
      elements,
      "クエストを未完了に戻しました",
      `${result.xpDelta} XP`,
      "↺",
    );

    return;
  }

  announce(
    elements,
    `${result.task.title}を完了。${result.xpDelta}経験値を獲得しました`,
  );

  showToast(
    elements,
    "QUEST COMPLETE!",
    `+${result.xpDelta} XP`,
    "✓",
  );

  if (
    result.newLevel >
    result.oldLevel
  ) {
    showLevelUp(
      elements,
      result.newLevel,
    );
  }
}

function handleDeleteTask(
  taskId,
) {
  const task =
    state.tasks.find(
      (candidate) =>
        candidate.id === taskId,
    );

  if (!task) {
    return;
  }

  const confirmed =
    window.confirm(
      `「${task.title}」をクエストログから削除しますか？`,
    );

  if (!confirmed) {
    return;
  }

  removeTask(
    state,
    taskId,
  );

  persist();
  render();

  announce(
    elements,
    `${task.title}を削除しました`,
  );

  showToast(
    elements,
    "クエストを削除しました",
    task.title,
    "×",
  );
}

function handleAddTask(
  formData,
) {
  const isDaily =
    formData.get(
      "repeatDaily",
    ) === "on";

  /*
   * 毎日タスクとして登録
   */
  if (isDaily) {
    const result =
      addDailyTemplate(
        state,
        {
          title:
            formData.get(
              "title",
            ),

          difficulty:
            formData.get(
              "difficulty",
            ),

          dueTime:
            formData.get(
              "dueTime",
            ),
        },
      );

    if (!result) {
      return;
    }

    persist();
    render();

    closeQuestDialog(
      elements,
    );

    announce(
      elements,
      `${result.template.title}を毎日タスクへ登録しました`,
    );

    const createdReward =
      result.createdTasks[0]
        ?.reward ?? 0;

    showToast(
      elements,
      "毎日タスクを登録しました",
      `${result.template.title} / +${createdReward} XP`,
      "＋",
    );

    return;
  }

  /*
   * 通常タスクとして登録
   */
  const task =
    addTask(
      state,
      {
        title:
          formData.get(
            "title",
          ),

        difficulty:
          formData.get(
            "difficulty",
          ),

        dueTime:
          formData.get(
            "dueTime",
          ),
      },
    );

  if (!task) {
    return;
  }

  persist();
  render();

  closeQuestDialog(
    elements,
  );

  announce(
    elements,
    `${task.title}を追加しました`,
  );

  showToast(
    elements,
    "クエストを追加しました",
    `${task.title} / +${task.reward} XP`,
    "+",
  );
}

function handleOpenQuest() {
  openQuestDialog(
    elements,
  );

  if (
    elements.repeatDaily
  ) {
    elements.repeatDaily.checked =
      false;
  }

  updateRewardPreview(
    elements,
  );
}

function handleOpenDailyQuest() {
  openQuestDialog(
    elements,
  );

  elements.repeatDaily.checked =
    true;

  updateRewardPreview(
    elements,
  );
}

function handleStartBattle(
  enemyId,
) {
  const result =
    startBattle(
      state,
      {
        enemyId,
      },
    );

  if (!result) {
    return;
  }

  /*
   * 戦闘結果とGOLDを保存
   */
  persist();
  render();

  if (result.victory) {
    announce(
      elements,
      `${result.enemyName}に勝利し、${result.goldEarned}ゴールドを獲得しました`,
    );

    showToast(
      elements,
      "VICTORY!",
      `+${result.goldEarned} GOLD`,
      "⚔",
    );

    return;
  }

  announce(
    elements,
    `${result.enemyName}との戦闘に敗北しました`,
  );

  showToast(
    elements,
    "DEFEAT",
    "GOLDは失いません",
    "×",
  );
}

function handleToggleDailyTemplate(
  templateId,
) {
  const template =
    toggleDailyTemplate(
      state,
      templateId,
    );

  if (!template) {
    return;
  }

  persist();
  render();

  announce(
    elements,
    template.enabled
      ? `${template.title}を再開しました`
      : `${template.title}を一時停止しました`,
  );

  showToast(
    elements,
    template.enabled
      ? "毎日タスクを再開しました"
      : "毎日タスクを停止しました",
    template.title,
    "↺",
  );
}

function handleDeleteDailyTemplate(
  templateId,
) {
  const template =
    state.daily
      ?.templates
      .find(
        (item) =>
          item.id ===
          templateId,
      );

  if (!template) {
    return;
  }

  const confirmed =
    window.confirm(
      `「${template.title}」の毎日設定を削除しますか？`,
    );

  if (!confirmed) {
    return;
  }

  removeDailyTemplate(
    state,
    templateId,
  );

  persist();
  render();

  announce(
    elements,
    `${template.title}の毎日設定を削除しました`,
  );

  showToast(
    elements,
    "毎日設定を削除しました",
    template.title,
    "×",
  );
}

function handleDailyDateChange(
  value,
) {
  /*
   * scheduler.mjsの実装差に対応して、
   * 文字列とオブジェクトの両方を受け取る
   */
  const dateKey =
    typeof value === "string"
      ? value
      : value?.dateKey;

  const result =
    generateTodayTasks(
      state,
      dateKey,
    );

  updateTodayLabel();
  persist();
  render();

  if (
    result.createdTasks.length >
    0
  ) {
    showToast(
      elements,
      "日付が変わりました",
      `${result.createdTasks.length}件の毎日タスクを生成しました`,
      "↺",
    );
  }
}

function handleReset() {
  const confirmed =
    window.confirm(
      "レベル・XP・クエスト・毎日タスク・戦闘記録をすべてリセットしますか？",
    );

  if (!confirmed) {
    return;
  }

  /*
   * battleを含むすべての状態を初期化
   */
  state =
    createDefaultState();

  generateTodayTasks(
    state,
  );

  persist();
  render();

  announce(
    elements,
    "すべてのデータをリセットしました",
  );

  showToast(
    elements,
    "データをリセットしました",
    "LEVEL 1 / 0 XP / 0 GOLD",
    "↺",
  );
}

function cacheElements() {
  elements = {
    todayLabel:
      document.getElementById(
        "todayLabel",
      ),

    levelNumber:
      document.getElementById(
        "levelNumber",
      ),

    xpCurrent:
      document.getElementById(
        "xpCurrent",
      ),

    xpTrack:
      document.getElementById(
        "xpTrack",
      ),

    xpBar:
      document.getElementById(
        "xpBar",
      ),

    nextLevelCopy:
      document.getElementById(
        "nextLevelCopy",
      ),

    activeQuestCount:
      document.getElementById(
        "activeQuestCount",
      ),

    completedQuestCount:
      document.getElementById(
        "completedQuestCount",
      ),

    questList:
      document.getElementById(
        "questList",
      ),

    filterTabs:
      Array.from(
        document.querySelectorAll(
          ".filter-tab",
        ),
      ),

    openQuestButton:
      document.getElementById(
        "openQuestButton",
      ),

    resetButton:
      document.getElementById(
        "resetButton",
      ),

    questDialog:
      document.getElementById(
        "questDialog",
      ),

    questForm:
      document.getElementById(
        "questForm",
      ),

    questTitle:
      document.getElementById(
        "questTitle",
      ),

    rewardPreview:
      document.getElementById(
        "rewardPreview",
      ),

    closeDialogButton:
      document.getElementById(
        "closeDialogButton",
      ),

    cancelDialogButton:
      document.getElementById(
        "cancelDialogButton",
      ),

    toastStack:
      document.getElementById(
        "toastStack",
      ),

    levelFlash:
      document.getElementById(
        "levelFlash",
      ),

    levelFlashNumber:
      document.getElementById(
        "levelFlashNumber",
      ),

    confettiLayer:
      document.getElementById(
        "confettiLayer",
      ),

    liveRegion:
      document.getElementById(
        "liveRegion",
      ),

    dailyTemplateList:
      document.getElementById(
        "dailyTemplateList",
      ),

    openDailyQuestButton:
      document.getElementById(
        "openDailyQuestButton",
      ),

    repeatDaily:
      document.getElementById(
        "repeatDaily",
      ),

    battleContainer:
      document.getElementById(
        "battleContainer",
      ),
  };
}

function bindEvents() {
  elements.openQuestButton
    .addEventListener(
      "click",
      handleOpenQuest,
    );

  elements.openDailyQuestButton
    .addEventListener(
      "click",
      handleOpenDailyQuest,
    );

  elements.resetButton
    .addEventListener(
      "click",
      handleReset,
    );

  elements.closeDialogButton
    .addEventListener(
      "click",
      () => {
        closeQuestDialog(
          elements,
        );
      },
    );

  elements.cancelDialogButton
    .addEventListener(
      "click",
      () => {
        closeQuestDialog(
          elements,
        );
      },
    );

  elements.repeatDaily
    .addEventListener(
      "change",
      () => {
        updateRewardPreview(
          elements,
        );
      },
    );

  elements.questForm
    .addEventListener(
      "change",
      () => {
        updateRewardPreview(
          elements,
        );
      },
    );

  elements.questForm
    .addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        const formData =
          new FormData(
            elements.questForm,
          );

        handleAddTask(
          formData,
        );
      },
    );

  elements.questDialog
    .addEventListener(
      "click",
      (event) => {
        if (
          event.target ===
          elements.questDialog
        ) {
          closeQuestDialog(
            elements,
          );
        }
      },
    );

  elements.filterTabs.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          state.filter =
            button.dataset.filter;

          persist();

          renderQuestList(
            elements,
            state,
            {
              toggleTask:
                handleToggleTask,

              deleteTask:
                handleDeleteTask,
            },
          );

          renderFilters(
            elements,
            state,
          );
        },
      );
    },
  );
}

function init() {
  cacheElements();

  state =
    loadState();

  /*
   * 今日の毎日タスクを生成
   */
  generateTodayTasks(
    state,
  );

  updateTodayLabel();
  bindEvents();

  /*
   * battleを含む状態を保存して描画
   */
  persist();
  render();

  /*
   * 日付変更を監視
   */
  startDailyScheduler({
    onDateChange:
      handleDailyDateChange,
  });
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    init,
    {
      once: true,
    },
  );
} else {
  init();
}