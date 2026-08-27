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
  const normalizedDifficulty =
    clampDifficulty(difficulty);

  return (
    DIFFICULTY_REWARDS[
      normalizedDifficulty
    ] ?? 0
  );
}

export function getProgress(
  totalXp,
) {
  const numericXp =
    Number(totalXp);

  const safeXp = Math.max(
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

  const valid =
    /^([01]\d|2[0-3]):[0-5]\d$/.test(
      dueTime,
    );

  return valid
    ? dueTime
    : "";
}

function normalizeDateKey(
  value,
) {
  const dateKey =
    String(value || "");

  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(
      dateKey,
    );

  return valid
    ? dateKey
    : null;
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

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return fallback;
  }

  return date.toISOString();
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

  /*
   * BOSS報酬を残さないため、
   * 未完了タスクの報酬は
   * 難易度から再計算します。
   */
  const reward =
    calculateTaskReward(
      difficulty,
    );

  /*
   * 完了済みタスクは、
   * 過去に実際に獲得したXPを保持します。
   */
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

  const createdAt =
    normalizeIsoDate(
      rawTask.createdAt,
      new Date().toISOString(),
    );

  const completedAt =
    completed
      ? normalizeIsoDate(
          rawTask.completedAt,
          new Date().toISOString(),
        )
      : null;

  return {
    id:
      String(
        rawTask.id ||
          createId(),
      ),

    title,
    difficulty,

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
    createdAt,
    completedAt,
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