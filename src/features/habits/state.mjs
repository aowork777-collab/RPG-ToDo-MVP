// Personal habit data lives inside rpg-todo:v1 so existing backups include it.
export const AVATARS = Object.freeze(["🌱", "🧑‍🚀", "🦊", "🐱", "🦉", "🐉", "🌙", "🌻"]);
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && dateKey(date) === value;
}
const text = (value, length) => typeof value === "string" ? value.trim().slice(0, length) : "";
const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback;
export function normalizeTags(value) {
  return [...new Set((Array.isArray(value) ? value : String(value || "").split(/[,、\s]+/)).map(tag => text(tag, 20).replace(/^#+/, "")).filter(Boolean))].slice(0, 5);
}
export function normalizeHabits(raw = {}, knownTasks = []) {
  const profile = raw?.profile || {};
  const completions = {};
  for (const item of Object.values(raw?.completions || {})) {
    if (!item || !text(item.id, 200) || !validDateKey(item.date)) continue;
    Object.defineProperty(completions, text(item.id, 200), {value: {id: text(item.id, 200), title: text(item.title, 60), date: item.date, xp: integer(item.xp), small: Boolean(item.small)}, enumerable: true, writable: true, configurable: true});
  }
  // Only recover achievements for which an actual completion time is known.
  for (const task of knownTasks) {
    if (!task?.completed || !task.id || !task.completedAt || Object.hasOwn(completions, task.id)) continue;
    const completedAt = new Date(task.completedAt);
    if (!Number.isFinite(completedAt.getTime())) continue;
    Object.defineProperty(completions, task.id, {value: {id: task.id, title: text(task.title, 60), date: dateKey(completedAt), xp: integer(task.earnedXp), small: Boolean(task.originalTitle)}, enumerable: true, writable: true, configurable: true});
  }
  const days = {};
  for (const [key, day] of Object.entries(raw?.days || {})) {
    if (validDateKey(key) && day && typeof day === "object") days[key] = {rest: Boolean(day.rest), note: text(day.note, 300), mood: ["good", "okay", "tired"].includes(day.mood) ? day.mood : ""};
  }
  const reflections = {};
  for (const [key, value] of Object.entries(raw?.reflections || {})) if (validDateKey(key)) reflections[key] = text(value, 600);
  return {
    profile: {name: text(profile.name, 30) || "冒険者", avatar: AVATARS.includes(profile.avatar) ? profile.avatar : "🌱", goal: text(profile.goal, 140), tags: normalizeTags(profile.tags)},
    weeklyGoal: Math.max(1, Math.min(7, integer(raw?.weeklyGoal, 4))),
    completions, days, reflections,
  };
}
export function recordCompletion(state, task) {
  state.habits ||= normalizeHabits();
  if (!task.completed) { delete state.habits.completions[task.id]; return; }
  Object.defineProperty(state.habits.completions, task.id, {value: {id: task.id, title: task.title, date: dateKey(new Date(task.completedAt)), xp: task.earnedXp, small: Boolean(task.originalTitle)}, enumerable: true, writable: true, configurable: true});
}
export function weekStart(date = new Date()) {
  const result = new Date(date); result.setHours(12, 0, 0, 0); result.setDate(result.getDate() - (result.getDay() + 6) % 7);
  return dateKey(result);
}
export function daySummary(habits, key) {
  const items = Object.values(habits.completions).filter(item => item.date === key);
  const day = habits.days[key] || {};
  return {items, count: items.length, xp: items.reduce((sum, item) => sum + item.xp, 0), ...day, status: items.length ? "completed" : day.rest ? "rest" : day.note || day.mood ? "recorded" : "empty"};
}
export function weekSummary(habits, today = new Date()) {
  const start = weekStart(today), end = dateKey(today);
  const items = Object.values(habits.completions).filter(item => item.date >= start && item.date <= end);
  return {start, activeDays: new Set(items.map(item => item.date)).size, count: items.length, xp: items.reduce((sum, item) => sum + item.xp, 0), goal: habits.weeklyGoal};
}
export function badges(habits) {
  const items = Object.values(habits.completions), days = new Set(items.map(item => item.date)).size;
  return [
    {name: "最初の一歩", description: "タスクを1件達成", earned: items.length >= 1, icon: "🌱"},
    {name: "小さな積み重ね", description: "タスクを10件達成", earned: items.length >= 10, icon: "✨"},
    {name: "7日の足あと", description: "7日間で達成を記録（連続でなくてOK）", earned: days >= 7, icon: "🗓"},
    {name: "続ける力", description: "30日間で達成を記録", earned: days >= 30, icon: "🏅"},
    {name: "やさしい再出発", description: "小さくしたタスクを達成", earned: items.some(item => item.small), icon: "🍃"},
  ];
}
