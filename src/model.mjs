import {
  createDailyInitialState,
  normalizeDailyState,
} from "./features/daily/state.mjs";

import {
  BOSS_REWARD,
  DIFFICULTY_REWARDS,
  XP_PER_LEVEL,
} from "./config.mjs";

export function clampDifficulty(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(5, Math.max(1, parsed)) : 1;
}

export function calculateTaskReward(difficulty, isBoss) {
  return isBoss ? BOSS_REWARD : DIFFICULTY_REWARDS[clampDifficulty(difficulty)];
}

export function getProgress(totalXp) {
  const numericXp = Number(totalXp);
  const safeXp = Math.max(0, Number.isFinite(numericXp) ? Math.floor(numericXp) : 0);
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const currentXp = safeXp % XP_PER_LEVEL;

  return {
    level,
    currentXp,
    nextLevel: level + 1,
    remainingXp: XP_PER_LEVEL - currentXp,
    percent: (currentXp / XP_PER_LEVEL) * 100,
  };
}

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `quest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createDefaultState() {
  return {
    totalXp: 0,
    filter: "active",
    tasks: [],
    daily: createDailyInitialState(),
  };
}

export function normalizeTask(rawTask) {
  if (!rawTask || typeof rawTask !== "object") return null;
  const title = String(rawTask.title || "").trim().slice(0, 60);
  if (!title) return null;

  const difficulty = clampDifficulty(rawTask.difficulty);
  const isBoss = Boolean(rawTask.isBoss);
  const completed = Boolean(rawTask.completed);
  const fallbackReward = calculateTaskReward(difficulty, isBoss);
  const reward = Math.max(0, Number.parseInt(rawTask.reward, 10) || fallbackReward);
  const earnedXp = completed
    ? Math.max(0, Number.parseInt(rawTask.earnedXp, 10) || reward)
    : 0;

  return {
    id: String(rawTask.id || createId()),
    title,
    difficulty,
    dueTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(rawTask.dueTime || ""))
      ? String(rawTask.dueTime)
      : "",
          dailyTemplateId:
      typeof rawTask.dailyTemplateId ===
      "string"
        ? rawTask.dailyTemplateId
        : null,

    dateKey:
      /^\d{4}-\d{2}-\d{2}$/.test(
        String(
          rawTask.dateKey || "",
        ),
      )
        ? String(rawTask.dateKey)
        : null,

    recurrence:
      rawTask.recurrence === "daily"
        ? "daily"
        : null,
    isBoss,
    completed,
    reward,
    earnedXp,
    createdAt: rawTask.createdAt || new Date().toISOString(),
    completedAt: completed ? rawTask.completedAt || new Date().toISOString() : null,
  };
}

export function normalizeState(rawState) {
  if (!rawState || typeof rawState !== "object") return createDefaultState();

  const tasks = Array.isArray(rawState.tasks)
    ? rawState.tasks.map(normalizeTask).filter(Boolean)
    : [];

  let activeBossFound = false;
  tasks.forEach((task) => {
    if (task.isBoss && !task.completed && !activeBossFound) {
      activeBossFound = true;
      task.reward = BOSS_REWARD;
    } else if (task.isBoss && !task.completed) {
      task.isBoss = false;
      task.reward = calculateTaskReward(task.difficulty, false);
    }
  });

  const allowedFilters = new Set(["active", "all", "completed"]);
  return {
    totalXp: Math.max(
      0,
      Number.parseInt(
        rawState.totalXp,
        10,
      ) || 0,
    ),

    filter:
      allowedFilters.has(rawState.filter)
        ? rawState.filter
        : "active",

    tasks,

    daily: normalizeDailyState(
      rawState.daily,
    ),
  };
}
