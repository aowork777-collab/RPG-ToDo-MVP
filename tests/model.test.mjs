import assert from "node:assert/strict";
import {
  addTask,
  promoteTaskToBoss,
  toggleTaskState,
} from "../src/actions.mjs";
import {
  calculateTaskReward,
  clampDifficulty,
  createDefaultState,
  getProgress,
  normalizeState,
} from "../src/model.mjs";

assert.deepEqual(getProgress(0), {
  level: 1,
  currentXp: 0,
  nextLevel: 2,
  remainingXp: 100,
  percent: 0,
});
assert.equal(getProgress(99).level, 1);
assert.equal(getProgress(100).level, 2);
assert.equal(getProgress(1168).level, 12);
assert.equal(getProgress(1168).currentXp, 68);
assert.equal(getProgress(-50).level, 1);

assert.equal(clampDifficulty(0), 1);
assert.equal(clampDifficulty(9), 5);
assert.equal(calculateTaskReward(2, false), 20);
assert.equal(calculateTaskReward(5, false), 75);
assert.equal(calculateTaskReward(1, true), 100);

const normalized = normalizeState({
  totalXp: 250,
  filter: "invalid",
  tasks: [
    { id: "a", title: "A", difficulty: 2, isBoss: true, completed: false },
    { id: "b", title: "B", difficulty: 3, isBoss: true, completed: false },
    { id: "empty", title: "  ", difficulty: 1 },
  ],
});
assert.equal(normalized.filter, "active");
assert.equal(normalized.tasks.length, 2);
assert.equal(normalized.tasks.filter((task) => task.isBoss).length, 1);
assert.equal(normalized.tasks[0].reward, 100);
assert.equal(normalized.tasks[1].reward, 35);

const state = createDefaultState();
const startingXp = state.totalXp;
const normalTask = state.tasks.find((task) => task.id === "demo-clean");
const completion = toggleTaskState(state, normalTask.id);
assert.equal(completion.xpDelta, 20);
assert.equal(state.totalXp, startingXp + 20);
const undo = toggleTaskState(state, normalTask.id);
assert.equal(undo.xpDelta, -20);
assert.equal(state.totalXp, startingXp);

const promoted = promoteTaskToBoss(state, normalTask.id);
assert.equal(promoted.id, normalTask.id);
assert.equal(promoted.reward, 100);
assert.equal(state.tasks.filter((task) => task.isBoss && !task.completed).length, 1);

const created = addTask(state, {
  title: "新しいクエスト",
  difficulty: 3,
  dueTime: "20:00",
  isBoss: false,
});
assert.equal(created.reward, 35);
assert.equal(state.tasks.at(-1).title, "新しいクエスト");

console.log("RPG ToDo model tests passed.");
