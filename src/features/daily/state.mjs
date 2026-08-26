const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function createDailyInitialState() {
  return {
    currentDateKey: null,
    templates: [],
    history: [],
  };
}

function normalizeTemplate(template, index) {
  if (!template || typeof template !== "object") {
    return null;
  }

  const title = String(
    template.title || "",
  ).trim();

  if (!title) {
    return null;
  }

  const parsedDifficulty = Number.parseInt(
    template.difficulty,
    10,
  );

  const difficulty = Number.isFinite(
    parsedDifficulty,
  )
    ? Math.min(5, Math.max(1, parsedDifficulty))
    : 1;

  return {
    id: String(
      template.id ||
      `daily-template-${Date.now()}-${index}`,
    ),

    title: title.slice(0, 60),
    difficulty,

    dueTime:
      /^([01]\d|2[0-3]):[0-5]\d$/.test(
        String(template.dueTime || ""),
      )
        ? String(template.dueTime)
        : "",

    enabled: template.enabled !== false,

    createdAt:
      template.createdAt ||
      new Date().toISOString(),
  };
}

export function normalizeDailyState(rawDaily) {
  if (!rawDaily || typeof rawDaily !== "object") {
    return createDailyInitialState();
  }

  const templates = Array.isArray(
    rawDaily.templates,
  )
    ? rawDaily.templates
        .map(normalizeTemplate)
        .filter(Boolean)
    : [];

  const history = Array.isArray(
    rawDaily.history,
  )
    ? rawDaily.history
        .filter(
          (task) =>
            task &&
            typeof task === "object",
        )
        .slice(-1000)
    : [];

  return {
    currentDateKey:
      DATE_PATTERN.test(
        String(rawDaily.currentDateKey || ""),
      )
        ? String(rawDaily.currentDateKey)
        : null,

    templates,
    history,
  };
}