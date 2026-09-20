import { dateKey, weekSummary, daySummary } from "./state.mjs";
import { el, button, field, submit, link } from "./dom.mjs";
import { calculateTaskReward } from "../../model.mjs";

export function renderTodayHabits(state, commit) {
  const name = document.querySelector(".player-name"), avatar = document.querySelector(".player-identity .avatar");
  if (name) name.textContent = state.habits.profile.name;
  if (avatar) avatar.textContent = state.habits.profile.avatar;
  let root = document.getElementById("todayHabitSummary");
  if (!root) {root = el("section", "panel today-habits"); root.id = "todayHabitSummary"; document.querySelector(".profile-card")?.after(root);}
  const week = weekSummary(state.habits), today = dateKey(), summary = daySummary(state.habits, today);
  root.replaceChildren(el("p", "hub-eyebrow", "あなたの週間目標"), el("h2", "", `今週 ${week.activeDays} / ${week.goal} 日達成`));
  const dots = el("div", "week-dots");
  for (let i = 0; i < 7; i++) {const date = new Date(`${week.start}T12:00:00`); date.setDate(date.getDate() + i); const key = dateKey(date), item = daySummary(state.habits, key); const dot = el("span", item.status, ["月", "火", "水", "木", "金", "土", "日"][i]); dot.title = `${key} ${item.count}件達成${item.rest ? " / 休む日" : ""}`; dots.append(dot);}
  root.append(dots, el("p", "muted", week.activeDays >= week.goal ? "今週の目標達成！ あなたのペースで続けよう。" : "1つできた日を数えます。連続でなくて大丈夫。"));
  const rest = button(summary.rest ? "☾ 今日は休む日（解除）" : "今日は休む日にする", () => {
    const previous = state.habits.days[today];
    state.habits.days[today] = {...state.habits.days[today], rest: !summary.rest};
    if (!commit()) { if (previous) state.habits.days[today] = previous; else delete state.habits.days[today]; }
  }, "hub-button subtle"); rest.setAttribute("aria-pressed", String(Boolean(summary.rest)));
  root.append(rest, link("カレンダーで振り返る →", "./hub.html#records", "habit-text-link"));
}

export function openSmallStep(state, id, commit) {
  const task = state.tasks.find(task => task.id === id && !task.completed); if (!task) return;
  const dialog = el("dialog", "hub-dialog"), form = el("form", "hub-form");
  const title = el("h2", "", "2分でできる一歩に変える"); title.id = "smallStepTitle"; dialog.setAttribute("aria-labelledby", title.id);
  form.append(title, el("p", "muted", `「${task.title}」を今日できる小さな行動にします。難易度は★、完了したら+${calculateTaskReward(1)} XP。毎日設定の元の名前は変わりません。`), field("まず何をする？", "title", "", {required: true, max: 60, placeholder: "例：本を1ページだけ読む"}), submit("今日の小さな一歩に変更"), button("キャンセル", () => dialog.close()));
  form.addEventListener("submit", event => {
    event.preventDefault(); const small = String(new FormData(form).get("title")).trim(); if (!small) return;
    const previous = {title: task.title, originalTitle: task.originalTitle, difficulty: task.difficulty, reward: task.reward};
    task.originalTitle ||= task.title; task.title = small; task.difficulty = 1; task.reward = calculateTaskReward(1);
    if (commit()) dialog.close(); else Object.assign(task, previous);
  });
  dialog.addEventListener("close", () => dialog.remove(), {once: true}); dialog.append(form); document.body.append(dialog); dialog.showModal();
}
