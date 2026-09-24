import { dateKey, validDateKey } from "../habits/state.mjs";
import { addTask } from "../../actions.mjs";
export function normalizePlanning(raw = {}) {
  const reviews = {};
  for (const [key, r] of Object.entries(raw?.reviews || {})) {
    if (!validDateKey(key) || !r || typeof r !== "object") continue;
    reviews[key] = {note: String(r.note || "").slice(0, 600), decisions: (Array.isArray(r.decisions) ? r.decisions : []).filter(d => d && typeof d.id === "string" && ["keep", "skip", "tomorrow"].includes(d.choice)).map(d => ({id:d.id, title:String(d.title || "").slice(0,60), choice:d.choice})), savedAt: String(r.savedAt || "")};
  }
  const r = raw?.reminder || {};
  return {reviews, reminder: {enabled: r.enabled === true, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) ? r.time : "20:00", weekdays: [...new Set((Array.isArray(r.weekdays) ? r.weekdays : [0,1,2,3,4,5,6]).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))]}};
}
export function recentTasks(state) {
  const recovered = Object.values(state.habits?.completions || {}).map(t=>({title:t.title,difficulty:2,createdAt:t.date}));
  const all = [...state.tasks, ...(state.daily?.history || []), ...recovered].sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const seen = new Set();
  return all.filter(task => {if (seen.has(task.title)) return false; seen.add(task.title); return true;}).slice(0, 20);
}
export function parseBulk(text) {
  const titles = String(text).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!titles.length) throw Error("1行に1つずつタスクを入力してください。");
  if (titles.length > 50) throw Error("一度に追加できるのは50件までです。");
  if (titles.some(s => s.length > 60)) throw Error("60文字を超える行があります。短くしてから追加してください。");
  return titles;
}
export function reviewTasks(state, day) {
  return [...state.tasks, ...(state.daily?.history || [])].filter(t => !t.completed && (t.dateKey ? t.dateKey === day : dateKey(new Date(t.createdAt)) <= day && (!t.dueDate || t.dueDate <= day)));
}
export function saveReview(state, day, note, choices) {
  if (!validDateKey(day) || day > dateKey()) throw Error("今日以前の日付を選んでください。");
  const tasks = reviewTasks(state, day), previous = state.planning.reviews[day];
  const decisions = [];
  for (const task of tasks) {
    const choice = choices[task.id] || "keep";
    if (!["keep", "skip", "tomorrow"].includes(choice)) continue;
    // Re-saving a reflection never duplicates a postponed task.
    const old = previous?.decisions.find(d => d.id === task.id);
    if (choice === "tomorrow" && old?.choice !== "tomorrow") {
      const next = new Date(`${day}T12:00:00`); next.setDate(next.getDate()+1);
      if (task.dailyTemplateId) {
        const carryId = `carry:${task.id}:${day}`;
        if (!state.tasks.some(t=>t.id===carryId)) {
          const added = addTask(state, {title:task.title, difficulty:task.difficulty, dueDate:dateKey(next), dueTime:task.dueTime, note:"振り返りから繰り越し"});
          added.id=carryId;
        }
      }
      else task.dueDate = dateKey(next);
    }
    decisions.push({id:task.id, title:task.title, choice});
  }
  // Retain decisions for items that were postponed or completed after this review.
  for (const d of previous?.decisions || []) if (!decisions.some(v=>v.id===d.id)) decisions.push(d);
  state.planning.reviews[day] = {note:String(note).trim().slice(0,600), decisions, savedAt:new Date().toISOString()};
}
