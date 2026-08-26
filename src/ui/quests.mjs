import {
  difficultyStars,
  formatDueTime,
} from "./helpers.mjs";

function matchesFilter(task, filter) {
  if (filter === "active") {
    return !task.completed;
  }

  if (filter === "completed") {
    return task.completed;
  }

  return true;
}

function createEmptyState(filter) {
  const copy = {
    active: [
      "未完了のクエストはありません",
      "新しいクエストを追加して冒険を始めましょう。",
    ],
    completed: [
      "完了したクエストはありません",
      "クエストを終えると、ここに記録されます。",
    ],
    all: [
      "クエストログは空です",
      "最初のクエストを追加しましょう。",
    ],
  }[filter];

  const empty = document.createElement("div");
  empty.className = "empty-list";

  const wrapper = document.createElement("div");

  const title = document.createElement("strong");
  title.textContent = copy[0];

  const description = document.createElement("span");
  description.textContent = copy[1];

  wrapper.append(title, description);
  empty.append(wrapper);

  return empty;
}

function createQuestItem(task, actions) {
  const item = document.createElement("article");

  item.className =
    `quest-item${task.completed ? " completed" : ""}`;

  item.dataset.taskId = task.id;

  const check = document.createElement("button");
  check.type = "button";

  check.className =
    `quest-check${task.completed ? " checked" : ""}`;

  check.setAttribute(
    "aria-label",
    task.completed
      ? `${task.title}を未完了に戻す`
      : `${task.title}を完了する`,
  );

  check.setAttribute(
    "aria-pressed",
    String(task.completed),
  );

  check.innerHTML =
    '<span aria-hidden="true">✓</span>';

  check.addEventListener("click", () => {
    actions.toggleTask(task.id);
  });

  const content = document.createElement("div");
  content.className = "quest-content";

  const title = document.createElement("h3");
  title.className = "quest-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const difficulty = document.createElement("span");
  difficulty.className = "difficulty";
  difficulty.textContent =
    difficultyStars(task.difficulty);

  difficulty.setAttribute(
    "aria-label",
    `難易度 ${task.difficulty}`,
  );

  const due = document.createElement("span");
  due.textContent = formatDueTime(task.dueTime);

  const reward = document.createElement("span");
  reward.className = "xp-reward";

  reward.textContent =
    `+${task.completed ? task.earnedXp : task.reward} XP`;

  meta.append(
    difficulty,
    due,
    reward,
  );

  content.append(
    title,
    meta,
  );

  const controls = document.createElement("div");
  controls.className = "quest-actions";

  const deleteButton =
    document.createElement("button");

  deleteButton.type = "button";
  deleteButton.className =
    "action-button delete-action";

  deleteButton.setAttribute(
    "aria-label",
    `${task.title}を削除する`,
  );

  deleteButton.title = "削除";
  deleteButton.textContent = "×";

  deleteButton.addEventListener("click", () => {
    actions.deleteTask(task.id);
  });

  controls.append(deleteButton);

  item.append(
    check,
    content,
    controls,
  );

  return item;
}

export function renderQuestList(
  elements,
  state,
  actions,
) {
  const visibleTasks = state.tasks
    .filter((task) =>
      matchesFilter(task, state.filter),
    )
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      return (
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
      );
    });

  elements.questList.replaceChildren();

  if (!visibleTasks.length) {
    elements.questList.append(
      createEmptyState(state.filter),
    );

    return;
  }

  const fragment =
    document.createDocumentFragment();

  visibleTasks.forEach((task) => {
    fragment.append(
      createQuestItem(task, actions),
    );
  });

  elements.questList.append(fragment);
}

export function renderFilters(elements, state) {
  elements.filterTabs.forEach((button) => {
    const active =
      button.dataset.filter === state.filter;

    button.classList.toggle(
      "active",
      active,
    );

    button.setAttribute(
      "aria-pressed",
      String(active),
    );
  });
}