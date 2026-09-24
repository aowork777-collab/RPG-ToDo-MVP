import { createIcon } from "../../ui/icons.mjs";
import { dateKey, validDateKey, daySummary, weekSummary, badges } from "./state.mjs";
import { el, button, field, selectField, panel, submit, empty, notice } from "./dom.mjs";

export function renderCalendar(root, state, commit) {
  const habits = state.habits, today = dateKey();
  let month = new Date(`${today.slice(0, 7)}-01T12:00:00`), selected = today;
  const week = weekSummary(habits);
  const stats = el("div", "hub-stats");
  for (const [label, value] of [["今週の達成日", `${week.activeDays} / ${week.goal} 日`], ["今週のタスク", `${week.count} 件`], ["今週の経験値", `${week.xp} XP`]]) {
    const card = el("div"); card.append(el("span", "muted", label), el("strong", "", value)); stats.append(card);
  }
  root.append(stats);
  const layout = el("div", "hub-columns"), calendar = panel("できたことのカレンダー"), detail = panel("その日の記録");
  const toolbar = el("div", "calendar-toolbar"), label = el("strong"), grid = el("div", "calendar-grid");
  toolbar.append(button("←", () => move(-1)), label, button("→", () => move(1)), button("今日", () => { month = new Date(`${today.slice(0, 7)}-01T12:00:00`); selected = today; draw(); }));
  toolbar.firstChild.setAttribute("aria-label", "前の月"); toolbar.children[2].setAttribute("aria-label", "次の月");
  calendar.append(toolbar, grid, el("p", "calendar-legend", "● 達成　☾ 休む日　◦ 記録あり　— 未記録"), el("p", "muted", "過去の記録は保存済みの完了履歴から復元しています。空欄は「失敗」ではありません。"));
  layout.append(calendar, detail); root.append(layout);
  function move(offset) { month.setMonth(month.getMonth() + offset); draw(); }
  function draw() {
    label.textContent = new Intl.DateTimeFormat("ja-JP", {year: "numeric", month: "long"}).format(month);
    grid.replaceChildren();
    for (const day of ["月", "火", "水", "木", "金", "土", "日"]) grid.append(el("span", "calendar-weekday", day));
    const offset = (month.getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) grid.append(el("span", "calendar-spacer"));
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day, 12)), summary = daySummary(habits, key);
      if (summary.status === "empty" && state.planning?.reviews[key]) summary.status = "recorded";
      const node = button("", () => { selected = key; draw(); }, `calendar-day ${summary.status}${key === today ? " today" : ""}`);
      node.setAttribute("aria-pressed", String(key === selected));
      node.setAttribute("aria-label", `${key}：${summary.count ? `${summary.count}件達成` : summary.status === "rest" ? "休む日" : summary.status === "recorded" ? "記録あり" : "未記録"}`);
      node.append(el("span", "", day), el("small", "", summary.count ? `${summary.count}件` : summary.status === "rest" ? "☾" : summary.status === "recorded" ? "◦" : "—"));
      grid.append(node);
    }
    drawDetail();
  }
  function drawDetail() {
    const summary = daySummary(habits, selected);
    detail.replaceChildren(el("p", "hub-eyebrow", selected), el("h2", "", summary.count ? `${summary.count}件達成 · ${summary.xp} XP` : summary.rest ? "自分で選んだ、休む日" : "その日の記録"));
    const list = el("ul", "achievement-list");
    for (const item of summary.items) { const row = el("li"); row.append(el("span", "", `✓ ${item.title}`), el("strong", "", `+${item.xp} XP`)); list.append(row); }
    if (summary.items.length) detail.append(list);
    const review = state.planning?.reviews[selected];
    if (review) {
      detail.append(el("h3", "", "一日の振り返り"), el("p", "", review.note || "振り返りを記録しました。"));
      for (const d of review.decisions) detail.append(el("p", "muted", `${d.title}：${d.choice === "skip" ? "休むと決めた" : d.choice === "tomorrow" ? "翌日に回した" : "未完了"}`));
    }
    if (!summary.items.length && !review) detail.append(empty("まだ達成記録はありません", "予定を休みにした日も、ひとこと残せます。"));
    if (selected > today) { detail.append(el("p", "muted", "未来の日付です。当日になったら記録できます。")); return; }
    const form = el("form", "hub-form"), rest = el("label", "hub-check"), checkbox = el("input");
    checkbox.type = "checkbox"; checkbox.name = "rest"; checkbox.checked = Boolean(summary.rest);
    rest.append(checkbox, el("span", "", "この日は、意識して休む日"));
    form.append(rest, selectField("気分（任意）", "mood", [["", "選択しない"], ["good", "よかった"], ["okay", "ふつう"], ["tired", "疲れた"]], summary.mood || ""), field("ひとこと（自分だけの記録）", "note", summary.note || "", {multiline: true, max: 300, placeholder: "できたこと、休んだ理由、明日の自分へ"}), submit("この日の記録を保存"));
    form.addEventListener("submit", event => {
      event.preventDefault(); if (!validDateKey(selected) || selected > dateKey()) return;
      const data = new FormData(form), previous = habits.days[selected]; habits.days[selected] = {rest: data.has("rest"), mood: data.get("mood"), note: String(data.get("note")).trim()};
      if (commit()) { notice("記録を保存しました。休む日も、続けるための選択です。"); draw(); }
      else if (previous) habits.days[selected] = previous;
      else delete habits.days[selected];
    });
    detail.append(form);
  }
  const reflection = panel("今週を振り返る", "連続日数が途切れても、積み重ねはなくなりません。自分のペースで振り返りましょう。");
  const form = el("form", "hub-form");
  form.append(field("できたこと・次に小さく始めること", "reflection", habits.reflections[week.start] || "", {multiline: true, max: 600, placeholder: "何がうまくいった？ 来週は何を少しだけ変えてみる？"}), submit("振り返りを保存"));
  form.addEventListener("submit", event => {
    event.preventDefault(); const previous = habits.reflections[week.start];
    habits.reflections[week.start] = String(new FormData(form).get("reflection")).trim();
    if (commit()) notice("今週の振り返りを保存しました。");
    else if (previous !== undefined) habits.reflections[week.start] = previous;
    else delete habits.reflections[week.start];
  });
  reflection.append(form); root.append(reflection);
  const trophies = panel("あなたの功績"), cards = el("div", "badge-grid");
  for (const badge of badges(habits)) { const card = el("article", `badge-card${badge.earned ? " earned" : ""}`); card.append(createIcon(badge.earned ? badge.icon : "lock", "badge-icon"), el("strong", "", badge.name), el("p", "muted", badge.description), el("small", "", badge.earned ? "獲得済み" : "これからの楽しみ")); cards.append(card); }
  trophies.append(cards); root.append(trophies); draw();
}
