import {
  calculateTaskReward,
} from "../../model.mjs";

import {
  difficultyStars,
  formatDueTime,
} from "../../ui/helpers.mjs";

import {
  getLocalDateKey,
} from "./state.mjs";

function createEmptyState(actions) {
  const empty = document.createElement("div");
  empty.className = "daily-empty";

  const title = document.createElement("strong");
  title.textContent = "毎日のクエストは未登録です";

  const description = document.createElement("p");
  description.textContent =
    "毎日必ず行いたいタスクを登録できます。";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary-button";
  button.textContent = "毎日クエストを追加";

  button.addEventListener(
    "click",
    actions.openCreate,
  );

  empty.append(
    title,
    description,
    button,
  );

  return empty;
}

function createTemplateItem(
  template,
  state,
  actions,
) {
  const todayKey = getLocalDateKey();

  const todayTask = state.tasks.find(
    (task) => {
      return (
        task.dailyTemplateId === template.id &&
        task.dateKey === todayKey
      );
    },
  );

  const item = document.createElement("article");

  item.className =
    `daily-template-item${
      template.enabled
        ? ""
        : " disabled"
    }`;

  const content = document.createElement("div");
  content.className = "daily-template-content";

  const title = document.createElement("h3");
  title.textContent = template.title;

  const meta = document.createElement("div");
  meta.className = "daily-template-meta";

  const difficulty = document.createElement("span");
  difficulty.textContent = difficultyStars(
    template.difficulty,
  );

  difficulty.setAttribute(
    "aria-label",
    `難易度 ${template.difficulty}`,
  );

  const due = document.createElement("span");
  due.textContent = formatDueTime(
    template.dueTime,
  );

  const reward = document.createElement("span");
  reward.className = "xp-reward";
  reward.textContent =
    `+${calculateTaskReward(template.difficulty)} XP`;

  const status = document.createElement("span");

  status.className =
    `daily-status ${
      todayTask?.completed
        ? "completed"
        : ""
    }`;

  if (!template.enabled) {
    status.textContent = "停止中";
  } else if (todayTask?.completed) {
    status.textContent = "本日完了";
  } else {
    status.textContent = "本日未完了";
  }

  meta.append(
    difficulty,
    due,
    reward,
    status,
  );

  content.append(
    title,
    meta,
  );

  const controls = document.createElement("div");
  controls.className = "daily-template-controls";

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "action-button";

  toggleButton.textContent =
    template.enabled
      ? "一時停止"
      : "再開";

  toggleButton.setAttribute(
    "aria-label",
    template.enabled
      ? `${template.title}を一時停止`
      : `${template.title}を再開`,
  );

  toggleButton.addEventListener(
    "click",
    () => {
      actions.toggleTemplate(
        template.id,
      );
    },
  );

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className =
    "action-button delete-action";
  deleteButton.textContent = "×";
  deleteButton.title = "削除";

  deleteButton.setAttribute(
    "aria-label",
    `${template.title}の毎日設定を削除`,
  );

  deleteButton.addEventListener(
    "click",
    () => {
      actions.deleteTemplate(
        template.id,
      );
    },
  );

  controls.append(
    toggleButton,
    deleteButton,
  );

  item.append(
    content,
    controls,
  );

  return item;
}

export function renderDailyList(
  elements,
  state,
  actions,
) {
  const container =
    elements.dailyTemplateList;

  if (!container) {
    return;
  }

  container.replaceChildren();

  const templates =
    state.daily?.templates ?? [];

  if (templates.length === 0) {
    container.append(
      createEmptyState(actions),
    );

    return;
  }

  const fragment =
    document.createDocumentFragment();

  for (const template of templates) {
    fragment.append(
      createTemplateItem(
        template,
        state,
        actions,
      ),
    );
  }

  container.append(fragment);
}