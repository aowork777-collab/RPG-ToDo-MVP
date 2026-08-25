import {
  addTask,
  promoteTaskToBoss,
  removeTask,
  toggleTaskState,
} from "./actions.mjs";

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
  renderBoss,
} from "./ui/boss.mjs";

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


/**
 * 現在の状態をlocalStorageへ保存
 */
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


/**
 * ヘッダーの日付を更新
 */
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


/**
 * 画面全体を再描画
 */
function render() {
  const questActions = {
    toggleTask: handleToggleTask,
    setBoss: handleSetBoss,
    deleteTask: handleDeleteTask,
    openQuest: handleOpenQuest,
  };

  renderProfile(
    elements,
    state,
  );

  renderBoss(
    elements,
    state,
    questActions,
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

  renderFilters(
    elements,
    state,
  );
}


/**
 * 通常・毎日タスクの完了切り替え
 */
function handleToggleTask(taskId) {
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

    result.wasBoss
      ? "BOSS DEFEATED!"
      : "QUEST COMPLETE!",

    `+${result.xpDelta} XP`,

    result.wasBoss
      ? "!"
      : "✓",
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


/**
 * 通常タスクをボスへ設定
 */
function handleSetBoss(taskId) {
  const selected =
    promoteTaskToBoss(
      state,
      taskId,
    );

  if (!selected) {
    return;
  }

  persist();
  render();

  announce(
    elements,
    `${selected.title}を今日のボスに設定しました`,
  );

  showToast(
    elements,
    "TODAY'S BOSS を更新",
    selected.title,
    "!",
  );

  document
    .getElementById(
      "bossSectionTitle",
    )
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
}


/**
 * 通常・当日タスクを削除
 */
function handleDeleteTask(taskId) {
  const task = state.tasks.find(
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


/**
 * 通常タスク・毎日タスクを追加
 */
function handleAddTask(formData) {
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

    showToast(
      elements,
      "毎日タスクを登録しました",
      `${
        result.template.title
      } / +${
        result.createdTasks[0]
          ?.reward ?? 0
      } XP`,
      "＋",
    );

    return;
  }

  /*
   * 通常タスクとして登録
   */
  const task = addTask(
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

      isBoss:
        formData.get(
          "isBoss",
        ) === "on",
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

    task.isBoss
      ? "新しいボスが出現"
      : "クエストを追加しました",

    `${task.title} / +${task.reward} XP`,

    task.isBoss
      ? "!"
      : "＋",
  );
}


/**
 * 通常クエスト追加画面を開く
 */
function handleOpenQuest(
  asBoss = false,
) {
  openQuestDialog(
    elements,
    asBoss,
  );

  if (
    elements.repeatDaily
  ) {
    elements.repeatDaily.checked =
      false;
  }
}


/**
 * 毎日クエスト追加画面を開く
 */
function handleOpenDailyQuest() {
  openQuestDialog(
    elements,
    false,
  );

  elements.repeatDaily.checked =
    true;

  elements.makeBoss.checked =
    false;

  updateRewardPreview(
    elements,
  );
}


/**
 * 毎日タスクの一時停止・再開
 */
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


/**
 * 毎日タスク設定を削除
 */
function handleDeleteDailyTemplate(
  templateId,
) {
  const template =
    state.daily?.templates.find(
      (item) =>
        item.id === templateId,
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


/**
 * 日付変更時の処理
 */
function handleDailyDateChange({
  dateKey,
}) {
  const result =
    generateTodayTasks(
      state,
      dateKey,
    );

  updateTodayLabel();
  persist();
  render();

  if (
    result.createdTasks.length > 0
  ) {
    showToast(
      elements,
      "日付が変わりました",
      `${result.createdTasks.length}件の毎日タスクを生成しました`,
      "↺",
    );
  }
}


/**
 * 全データを初期化
 */
function handleReset() {
  const confirmed =
    window.confirm(
      "レベル・XP・クエスト・毎日タスクをすべてリセットしますか？",
    );

  if (!confirmed) {
    return;
  }

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
    "LEVEL 1 / 0 XP",
    "↺",
  );
}


/**
 * HTML要素を取得
 */
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

    bossContainer:
      document.getElementById(
        "bossContainer",
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

    makeBoss:
      document.getElementById(
        "makeBoss",
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
  };
}


/**
 * イベント登録
 */
function bindEvents() {
  elements.openQuestButton
    .addEventListener(
      "click",
      () =>
        handleOpenQuest(false),
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
      () =>
        closeQuestDialog(
          elements,
        ),
    );

  elements.cancelDialogButton
    .addEventListener(
      "click",
      () =>
        closeQuestDialog(
          elements,
        ),
    );

  /*
   * 毎日タスクとボス指定は同時に選択不可
   */
  elements.repeatDaily
    .addEventListener(
      "change",
      () => {
        if (
          elements
            .repeatDaily
            .checked
        ) {
          elements.makeBoss.checked =
            false;
        }

        updateRewardPreview(
          elements,
        );
      },
    );

  elements.makeBoss
    .addEventListener(
      "change",
      () => {
        if (
          elements
            .makeBoss
            .checked
        ) {
          elements.repeatDaily.checked =
            false;
        }

        updateRewardPreview(
          elements,
        );
      },
    );

  elements.questForm
    .addEventListener(
      "change",
      () =>
        updateRewardPreview(
          elements,
        ),
    );

  elements.questForm
    .addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        handleAddTask(
          new FormData(
            elements.questForm,
          ),
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

              setBoss:
                handleSetBoss,

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


/**
 * アプリ起動
 */
function init() {
  cacheElements();

  state = loadState();

  /*
   * ページを開いた時点で
   * 今日の毎日タスクを生成
   */
  generateTodayTasks(
    state,
  );

  updateTodayLabel();

  bindEvents();

  persist();
  render();

  /*
   * ページを開いたまま
   * 日付が変わった場合の監視
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