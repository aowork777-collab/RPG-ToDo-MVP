import {
  calculateTaskReward,
  clampDifficulty,
  createId,
} from "../../model.mjs";

import {
  createDailyInitialState,
  getLocalDateKey,
} from "./state.mjs";

function ensureDailyState(state) {
  if (!state.daily) {
    state.daily = createDailyInitialState();
  }

  if (!Array.isArray(state.tasks)) {
    state.tasks = [];
  }

  return state.daily;
}

export function createDailyTask(
  template,
  dateKey,
) {
  return {
    id: `daily:${template.id}:${dateKey}`,

    dailyTemplateId: template.id,
    dateKey,
    recurrence: "daily",

    title: template.title,
    difficulty: template.difficulty,
    dueTime: template.dueTime || "",

    isBoss: false,
    completed: false,

    reward: calculateTaskReward(
      template.difficulty,
      false,
    ),

    earnedXp: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function generateTodayTasks(
  state,
  dateKey = getLocalDateKey(),
) {
  const daily = ensureDailyState(state);
  const archivedTasks = [];
  const createdTasks = [];

  // 前日以前のデイリータスクを履歴へ移動
  const currentTasks = [];

  for (const task of state.tasks) {
    const isPastDailyTask =
      task.dailyTemplateId &&
      task.dateKey !== dateKey;

    if (isPastDailyTask) {
      const alreadyArchived =
        daily.history.some(
          (historyTask) =>
            historyTask.id === task.id,
        );

      if (!alreadyArchived) {
        daily.history.push(task);
        archivedTasks.push(task);
      }
    } else {
      currentTasks.push(task);
    }
  }

  state.tasks = currentTasks;

  // 履歴が増え続けないよう上限を設定
  daily.history = daily.history.slice(-1000);

  // 今日のタスクを生成
  for (const template of daily.templates) {
    if (!template.enabled) {
      continue;
    }

    const taskId =
      `daily:${template.id}:${dateKey}`;

    const alreadyExists = state.tasks.some(
      (task) => task.id === taskId,
    );

    if (alreadyExists) {
      continue;
    }

    const task = createDailyTask(
      template,
      dateKey,
    );

    state.tasks.push(task);
    createdTasks.push(task);
  }

  daily.currentDateKey = dateKey;

  return {
    createdTasks,
    archivedTasks,
  };
}

export function addDailyTemplate(
  state,
  values,
) {
  const daily = ensureDailyState(state);

  const title = String(
    values.title || "",
  ).trim();

  if (!title) {
    return null;
  }

  const template = {
    id: createId(),
    title: title.slice(0, 60),

    difficulty: clampDifficulty(
      values.difficulty,
    ),

    dueTime: String(
      values.dueTime || "",
    ),

    enabled: true,
    createdAt: new Date().toISOString(),
  };

  daily.templates.push(template);

  const update = generateTodayTasks(state);

  return {
    template,
    ...update,
  };
}

export function toggleDailyTemplate(
  state,
  templateId,
) {
  const daily = ensureDailyState(state);

  const template = daily.templates.find(
    (item) => item.id === templateId,
  );

  if (!template) {
    return null;
  }

  template.enabled = !template.enabled;

  if (template.enabled) {
    generateTodayTasks(state);
  }

  return template;
}

export function removeDailyTemplate(
  state,
  templateId,
) {
  const daily = ensureDailyState(state);

  const template = daily.templates.find(
    (item) => item.id === templateId,
  );

  if (!template) {
    return null;
  }

  daily.templates =
    daily.templates.filter(
      (item) => item.id !== templateId,
    );

  // 今日生成済みのタスクは残します。
  // 翌日以降は生成されません。

  return template;
}