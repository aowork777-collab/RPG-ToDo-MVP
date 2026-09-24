import { normalizeHabits } from "./features/habits/state.mjs";
import { normalizePlanning } from "./features/planning/state.mjs";
import {
  createBattleInitialState,
  normalizeBattleState,
} from "./features/battle/state.mjs";

import {
  createDailyInitialState,
  normalizeDailyState,
} from "./features/daily/state.mjs";

import {
  DIFFICULTY_REWARDS,
  XP_PER_LEVEL,
} from "./config.mjs";

export function clampDifficulty(
  value,
) {
  const parsed =
    Number.parseInt(
      value,
      10,
    );

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(
    5,
    Math.max(1, parsed),
  );
}

export function calculateTaskReward(
  difficulty,
) {
  return (
    DIFFICULTY_REWARDS[
      clampDifficulty(difficulty)
    ] ?? 0
  );
}

export function getProgress(
  totalXp,
) {
  const numericXp =
    Number(totalXp);

  const safeXp =
    Math.max(
      0,
      Number.isFinite(numericXp)
        ? Math.floor(numericXp)
        : 0,
    );

  const level =
    Math.floor(
      safeXp / XP_PER_LEVEL,
    ) + 1;

  const currentXp =
    safeXp % XP_PER_LEVEL;

  return {
    level,
    currentXp,

    nextLevel:
      level + 1,

    remainingXp:
      XP_PER_LEVEL -
      currentXp,

    percent:
      (currentXp /
        XP_PER_LEVEL) *
      100,
  };
}

export function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    `quest-${Date.now()}-` +
    Math.random()
      .toString(16)
      .slice(2)
  );
}

export function createDefaultState() {
  return {
    totalXp: 0,
    filter: "active",
    tasks: [],
    habits: normalizeHabits(),
    planning: normalizePlanning(),

    daily:
      createDailyInitialState(),

    battle:
      createBattleInitialState(),
  };
}

function normalizeDueTime(
  value,
) {
  const dueTime =
    String(value || "");

  return (
    /^([01]\d|2[0-3]):[0-5]\d$/.test(
      dueTime,
    )
      ? dueTime
      : ""
  );
}

function normalizeDateKey(
  value,
) {
  const dateKey =
    String(value || "");

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(
      dateKey,
    )
      ? dateKey
      : null
  );
}

function normalizeIsoDate(
  value,
  fallback = null,
) {
  if (
    typeof value !== "string"
  ) {
    return fallback;
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? fallback
    : date.toISOString();
}

export function normalizeTask(
  rawTask,
) {
  if (
    !rawTask ||
    typeof rawTask !== "object"
  ) {
    return null;
  }

  const title =
    String(
      rawTask.title || "",
    )
      .trim()
      .slice(0, 60);

  if (!title) {
    return null;
  }

  const difficulty =
    clampDifficulty(
      rawTask.difficulty,
    );

  const completed =
    Boolean(
      rawTask.completed,
    );

  const reward =
    calculateTaskReward(
      difficulty,
    );

  const rawEarnedXp =
    Number.parseInt(
      rawTask.earnedXp,
      10,
    );

  const earnedXp =
    completed
      ? Math.max(
          0,
          Number.isFinite(
            rawEarnedXp,
          )
            ? rawEarnedXp
            : reward,
        )
      : 0;

  return {
    id:
      String(
        rawTask.id ||
          createId(),
      ),

    title,
    difficulty,
    dueDate: normalizeDateKey(rawTask.dueDate) || "",
    note: String(rawTask.note || "").slice(0,500),
    originalTitle: String(rawTask.originalTitle || "").slice(0,60),

    dueTime:
      normalizeDueTime(
        rawTask.dueTime,
      ),

    dailyTemplateId:
      typeof rawTask.dailyTemplateId ===
      "string"
        ? rawTask.dailyTemplateId
        : null,

    dateKey:
      normalizeDateKey(
        rawTask.dateKey,
      ),

    recurrence:
      rawTask.recurrence ===
      "daily"
        ? "daily"
        : null,

    completed,
    reward,
    earnedXp,

    createdAt:
      normalizeIsoDate(
        rawTask.createdAt,
        new Date().toISOString(),
      ),

    completedAt:
      completed
        ? normalizeIsoDate(
            rawTask.completedAt,
            null,
          )
        : null,
  };
}

export function normalizeState(
  rawState,
) {
  if (
    !rawState ||
    typeof rawState !== "object"
  ) {
    return createDefaultState();
  }

  const tasks =
    Array.isArray(
      rawState.tasks,
    )
      ? rawState.tasks
          .map(normalizeTask)
          .filter(Boolean)
      : [];

  const allowedFilters =
    new Set([
      "active",
      "all",
      "completed",
    ]);

  const parsedTotalXp =
    Number.parseInt(
      rawState.totalXp,
      10,
    );

  return {
    totalXp:
      Math.max(
        0,
        Number.isFinite(
          parsedTotalXp,
        )
          ? parsedTotalXp
          : 0,
      ),

    filter:
      allowedFilters.has(
        rawState.filter,
      )
        ? rawState.filter
        : "active",

    tasks,
    planning: normalizePlanning(rawState.planning),
    habits: normalizeHabits(rawState.habits, [...(Array.isArray(rawState.tasks) ? rawState.tasks : []), ...(Array.isArray(rawState.daily?.history) ? rawState.daily.history : [])]),

    daily:
      normalizeDailyState(
        rawState.daily,
      ),

    battle:
      normalizeBattleState(
        rawState.battle,
      ),
  };
}
