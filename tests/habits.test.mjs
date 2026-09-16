import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultState, normalizeState } from "../src/model.mjs";
import { addTask, toggleTaskState, removeTask } from "../src/actions.mjs";
import { normalizeHabits, daySummary, dateKey, weekSummary, normalizeTags, validDateKey, badges } from "../src/features/habits/state.mjs";
import { generateTodayTasks } from "../src/features/daily/actions.mjs";
import { createBattleState, canUseSkill, resolvePlayerAction } from "../src/game/battle/battle-engine.mjs";
import { getStage } from "../src/game/data/stages.mjs";
import { relicBonuses, CHAPTERS } from "../src/game/data/chapters.mjs";
import { createBackup, restoreBackup } from "../src/features/backup/backup.mjs";

test("Old saves migrate known completed history without inventing dates or changing XP", () => {
  const old = {totalXp: 1120, tasks: [{id: "old", title: "読書", completed: true, completedAt: "2026-08-20T10:00:00Z", earnedXp: 20}, {id: "unknown", title: "日時不明", completed: true}], daily: {templates: [], history: [{id: "daily-1", title: "運動", completed: true, completedAt: "2026-08-19T10:00:00Z", earnedXp: 10}]}};
  const migrated = normalizeState(old); assert.equal(migrated.totalXp, 1120); assert.equal(Object.keys(migrated.habits.completions).length, 2);
  assert.equal(migrated.habits.completions.old.date, dateKey(new Date("2026-08-20T10:00:00Z")));
  assert.equal(Object.keys(normalizeState(migrated).habits.completions).length, 2);
});
test("Completion, undo, recompletion never duplicate achievements or XP", () => {
  const state = createDefaultState(); const task = addTask(state, {title: "一歩", difficulty: 2});
  toggleTaskState(state, task.id); assert.equal(state.totalXp, 20); assert.equal(daySummary(state.habits, dateKey()).count, 1);
  toggleTaskState(state, task.id); assert.equal(state.totalXp, 0); assert.equal(daySummary(state.habits, dateKey()).count, 0);
  toggleTaskState(state, task.id); assert.equal(state.totalXp, 20); assert.equal(daySummary(state.habits, dateKey()).count, 1);
});
test("Deleting a completed task retains earned achievements and backup restores them", () => {
  const state = createDefaultState(); const task = addTask(state, {title: "残る実績", difficulty: 2}); toggleTaskState(state, task.id); removeTask(state, task.id);
  const again = normalizeState(state); assert.equal(again.tasks.length, 0); assert.equal(Object.keys(again.habits.completions).length, 1); assert.equal(again.totalXp, 20);
  const map = new Map([["rpg-todo:v1", JSON.stringify(again)]]), storage = {getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key)};
  const backup = createBackup(storage); map.delete("rpg-todo:v1"); restoreBackup(backup, storage); assert.equal(JSON.parse(map.get("rpg-todo:v1")).habits.completions[task.id].title, "残る実績");
});
test("Rest days differ from unrecorded days but do not give XP or count as completed days", () => {
  const habits = normalizeHabits({days: {"2026-09-14": {rest: true, note: "休養"}}});
  assert.equal(daySummary(habits, "2026-09-14").status, "rest"); assert.equal(daySummary(habits, "2026-09-15").status, "empty");
  assert.equal(weekSummary(habits, new Date("2026-09-15T12:00:00")).activeDays, 0);
});
test("Week goal counts distinct local days, not tasks or streak length", () => {
  const habits = normalizeHabits({weeklyGoal: 4, completions: {a: {id: "a", date: "2026-09-14", xp: 20}, b: {id: "b", date: "2026-09-14", xp: 10}, c: {id: "c", date: "2026-09-16", xp: 10}, d: {id: "d", date: "2026-09-13", xp: 50}}});
  assert.deepEqual(weekSummary(habits, new Date("2026-09-16T12:00:00")), {start: "2026-09-14", activeDays: 2, count: 3, xp: 40, goal: 4});
});
test("Date rollover preserves daily achievements and does not grant unearned XP", () => {
  const state = createDefaultState(); state.daily.templates.push({id: "t", title: "毎日", enabled: true, difficulty: 1, dueTime: ""});
  generateTodayTasks(state); const task = state.tasks[0]; toggleTaskState(state, task.id);
  task.dateKey = "2026-01-01"; generateTodayTasks(state); assert.equal(state.totalXp, 10); assert.equal(Object.keys(state.habits.completions).length, 1); assert.equal(state.tasks.filter(t => !t.completed).length, 1);
});
test("Untrusted profile, date and history inputs are bounded; property names are not prototypes", () => {
  assert.equal(validDateKey("2026-02-31"), false); assert.equal(validDateKey("2028-02-29"), true);
  assert.deepEqual(normalizeTags("#勉強, 勉強, 読書, 運動, 睡眠, 英語, 音楽"), ["勉強", "読書", "運動", "睡眠", "英語"]);
  const habits = normalizeHabits({weeklyGoal: 100, profile: {name: "x".repeat(100)}, completions: {a: {id: "__proto__", date: "2026-09-15", xp: 10}}});
  assert.equal(habits.weeklyGoal, 7); assert.equal(habits.profile.name.length, 30); assert.equal(Object.getPrototypeOf(habits.completions), Object.prototype); assert.equal(Object.hasOwn(habits.completions, "__proto__"), true);
});
test("Small-step achievement is only awarded after actual task completion", () => {
  const state = createDefaultState(); const task = addTask(state, {title: "1ページ読む", difficulty: 1}); task.originalTitle = "本を1章読む";
  assert.equal(badges(state.habits).at(-1).earned, false); toggleTaskState(state, task.id); assert.equal(badges(state.habits).at(-1).earned, true); assert.equal(state.totalXp, 10);
});
test("New skills require real ToDo levels and spend exactly two SP", () => {
  const locked = createBattleState(getStage(20), 1); assert.equal(canUseSkill(locked, "star-rain"), false); assert.equal(resolvePlayerAction(locked, "star-rain"), null); assert.equal(locked.sp, 3);
  const ready = createBattleState(getStage(20), 5); assert.equal(canUseSkill(ready, "star-rain"), true); resolvePlayerAction(ready, "star-rain", () => .5); assert.equal(ready.sp, 1); assert.equal(canUseSkill(ready, "soul-blade"), false);
  const advanced = createBattleState(getStage(20), 10); assert.equal(canUseSkill(advanced, "soul-blade"), true);
});
test("Ten chapters cover every stage and relics never change player level", () => {
  assert.deepEqual(CHAPTERS.flatMap(c => Array.from({length: c.last-c.first+1}, (_, i) => c.first+i)), Array.from({length: 100}, (_, i) => i+1));
  assert.deepEqual(relicBonuses(9), {relics: 0, attack: 0, hp: 0}); assert.deepEqual(relicBonuses(10), {relics: 1, attack: 2, hp: 5});
  const battle = createBattleState(getStage(11), 3, relicBonuses(10)); assert.equal(battle.player.level, 3);
});
