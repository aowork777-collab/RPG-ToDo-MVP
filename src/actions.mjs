import { BOSS_REWARD } from "./config.mjs";
import {
  calculateTaskReward,
  clampDifficulty,
  createId,
  getProgress,
} from "./model.mjs";

export function toggleTaskState(state, taskId) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return null;

  const oldLevel = getProgress(state.totalXp).level;
  const wasBoss = task.isBoss;

  if (task.completed) {
    const removedXp = task.earnedXp;
    state.totalXp = Math.max(0, state.totalXp - removedXp);
    task.completed = false;
    task.completedAt = null;
    task.earnedXp = 0;
    task.reward = calculateTaskReward(task.difficulty, task.isBoss);

    return {
      task,
      wasBoss,
      completed: false,
      xpDelta: -removedXp,
      oldLevel,
      newLevel: getProgress(state.totalXp).level,
    };
  }

  const earnedXp = task.reward;
  task.completed = true;
  task.completedAt = new Date().toISOString();
  task.earnedXp = earnedXp;
  state.totalXp += earnedXp;

  return {
    task,
    wasBoss,
    completed: true,
    xpDelta: earnedXp,
    oldLevel,
    newLevel: getProgress(state.totalXp).level,
  };
}

export function promoteTaskToBoss(state, taskId) {
  const selected = state.tasks.find((task) => task.id === taskId && !task.completed);
  if (!selected) return null;

  state.tasks.forEach((task) => {
    task.isBoss = task.id === taskId;
    if (!task.completed) {
      task.reward = calculateTaskReward(task.difficulty, task.isBoss);
    }
  });
  return selected;
}

export function removeTask(state, taskId) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return null;
  state.tasks = state.tasks.filter((candidate) => candidate.id !== taskId);
  return task;
}

export function addTask(state, values) {
  const title = String(values.title || "").trim().slice(0, 60);
  if (!title) return null;

  const difficulty = clampDifficulty(values.difficulty);
  const isBoss = Boolean(values.isBoss);

  if (isBoss) {
    state.tasks.forEach((task) => {
      if (task.isBoss && !task.completed) {
        task.isBoss = false;
        task.reward = calculateTaskReward(task.difficulty, false);
      }
    });
  }

  const task = {
    id: createId(),
    title,
    difficulty,
    dueTime: String(values.dueTime || ""),
    isBoss,
    completed: false,
    reward: isBoss ? BOSS_REWARD : calculateTaskReward(difficulty, false),
    earnedXp: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  state.tasks.push(task);
  state.filter = "active";
  return task;
}
