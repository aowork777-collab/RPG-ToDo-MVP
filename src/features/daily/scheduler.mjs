import {
  getLocalDateKey,
} from "./state.mjs";

export function startDailyScheduler({
  onDateChange,
  intervalMs = 60_000,
}) {
  let currentDateKey =
    getLocalDateKey();

  function checkDate() {
    const nextDateKey =
      getLocalDateKey();

    if (nextDateKey === currentDateKey) {
      return;
    }

    const previousDateKey =
      currentDateKey;

    currentDateKey = nextDateKey;

    onDateChange?.({
      previousDateKey,
      dateKey: nextDateKey,
    });
  }

  const timerId = window.setInterval(
    checkDate,
    intervalMs,
  );

  function handleVisibilityChange() {
    if (
      document.visibilityState === "visible"
    ) {
      checkDate();
    }
  }

  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange,
  );

  // 必要になった場合に監視を停止できる
  return function stopDailyScheduler() {
    window.clearInterval(timerId);

    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );
  };
}