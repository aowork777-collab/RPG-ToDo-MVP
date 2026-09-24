import {
  difficultyStars,
  formatDueTime,
} from "./helpers.mjs";

import { deadlineLabel } from "../features/tasks/details.mjs";
import { dateKey } from "../features/habits/state.mjs";

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
      "未完了のタスクはありません",
      "今日やりたいことを、上の入力欄から1つ追加してみましょう。",
    ],
    completed: [
      "完了したタスクはまだありません",
      "タスクの左の ✓ を押すと、ここに達成したことが並びます。",
    ],
    all: [
      "最初のタスクを追加しましょう",
      "「水を1杯飲む」「本を1ページ読む」。小さなことで大丈夫です。",
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

function createQuestItem(task, actions, decision) {
  const item = document.createElement("article");

  item.className =
    `quest-item${task.completed ? " completed" : ""}`;

  item.dataset.taskId = task.id;

  const check = document.createElement("button");
  check.type = "button";
  check.dataset.action = "complete";

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
  if (!task.completed && decision && decision !== "keep") {
    const status = document.createElement("span");
    status.className = "review-task-status";
    status.textContent = decision === "skip" ? "今日は休むと決めた" : "翌日に繰り越し";
    meta.append(status);
  }

  const difficulty = document.createElement("span");
  difficulty.className = "difficulty";
  difficulty.textContent =
    difficultyStars(task.difficulty);

  difficulty.setAttribute(
    "aria-label",
    `難易度 ${task.difficulty}`,
  );

  const due = document.createElement("span");
  const deadline = deadlineLabel(task);
  due.textContent = deadline.text || formatDueTime(task.dueTime);
  if (deadline.overdue) due.className = "overdue-label";

  const reward = document.createElement("span");
  reward.className = "xp-reward";

  reward.textContent =
    `+${task.completed ? task.earnedXp : task.reward} XP`;

  meta.append(
    difficulty,
    due,
    reward,
  );

  if (task.dailyTemplateId) {
    const badge = document.createElement("span");
    badge.className = "daily-badge"; badge.textContent = "毎日"; meta.append(badge);
  }
  content.append(
    title,
    meta,
  );

  if (task.note) {
    const note = document.createElement("p");note.className="quest-note";note.textContent=task.note;content.append(note);
  }
  const controls = document.createElement("div");
  controls.className = "quest-actions";
  const more = document.createElement("details"); more.className = "task-more";
  const moreLabel = document.createElement("summary"); moreLabel.textContent = "その他";
  moreLabel.setAttribute("aria-label", `${task.title}のその他の操作`);
  const morePanel = document.createElement("div"); morePanel.className = "task-more-panel";
  more.append(moreLabel, morePanel);

  const deleteButton =
    document.createElement("button");

  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.className =
    "action-button delete-action";

  deleteButton.setAttribute(
    "aria-label",
    `${task.title}を削除する`,
  );

  deleteButton.title = "削除";
  deleteButton.textContent = "削除";

  deleteButton.addEventListener("click", () => {
    actions.deleteTask(task.id);
  });

  if (actions.editTask) {
    const editButton=document.createElement("button");editButton.type="button";editButton.className="action-button";
    editButton.textContent="編集";editButton.setAttribute("aria-label",task.title+"を編集");
    editButton.dataset.action="edit";
    editButton.addEventListener("click",()=>actions.editTask(task.id));controls.append(editButton);
  }
  if (!task.completed && actions.smallStep) {
    const small = document.createElement("button"); small.type = "button"; small.className = "action-button small-step-button"; small.textContent = "小さく始める";
    small.dataset.action = "small";
    small.setAttribute("aria-label", task.title + "を2分でできる一歩に変える"); small.addEventListener("click", () => { more.open = false; actions.smallStep(task.id); }); morePanel.append(small);
  }
  morePanel.append(deleteButton); controls.append(more);
  if (task.originalTitle) {const original = document.createElement("small"); original.className = "quest-note"; original.textContent = "小さな一歩 · 元の目標：" + task.originalTitle; content.append(original);}

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
  const query = (elements.questSearch?.value || "").trim().toLocaleLowerCase("ja-JP");
  const focused = document.activeElement;
  const focusedTaskId = focused?.closest?.(".quest-item")?.dataset.taskId;
  const focusedAction = focused?.dataset?.action || "complete";
  const visibleTasks = state.tasks
    .filter(task => !query || task.title.toLocaleLowerCase("ja-JP").includes(query))
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

  if (elements.listSummary) {
    const completed = state.tasks.filter(task => task.completed).length;
    elements.listSummary.textContent = query
      ? "検索結果 " + visibleTasks.length + " 件"
      : state.tasks.length + " 件中 " + completed + " 件完了";
  }
  elements.questList.replaceChildren();

  if (!visibleTasks.length) {
    const empty = createEmptyState(state.filter);
    if (query) {
      empty.querySelector("strong").textContent = "一致するタスクがありません";
      empty.querySelector("span").textContent = "検索する言葉を変えてみてください。";
    }
    elements.questList.append(empty);

    return;
  }

  const fragment =
    document.createDocumentFragment();

  visibleTasks.forEach((task) => {
    fragment.append(
      createQuestItem(task, actions, state.planning?.reviews[dateKey()]?.decisions.find(d=>d.id===task.id)?.choice),
    );
  });

  elements.questList.append(fragment);
  if (focusedTaskId) {
    const rows = Array.from(elements.questList.children);
    const sameRow = rows.find(node => node.dataset.taskId === focusedTaskId);
    const target = sameRow?.querySelector(`[data-action="${["complete", "edit", "delete", "small"].includes(focusedAction) ? focusedAction : "complete"}"]`) || rows[0]?.querySelector(".quest-check");
    if (target?.closest("details")) target.closest("details").open = true;
    target?.focus({ preventScroll: true });
  }
}

export function renderFilters(elements, state) {
  const completed = state.tasks.filter(task => task.completed).length;
  const counts = { active: state.tasks.length - completed, all: state.tasks.length, completed };
  const labels = { active: "未完了", all: "すべて", completed: "完了" };
  elements.filterTabs.forEach((button) => {
    button.textContent = labels[button.dataset.filter] + " " + counts[button.dataset.filter];
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
