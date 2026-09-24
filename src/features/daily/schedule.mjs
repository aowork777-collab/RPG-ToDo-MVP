const names = ["日", "月", "火", "水", "木", "金", "土"];
export function validDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function normalizeSchedule(raw = {}) {
  const kind = ["daily", "weekly", "interval"].includes(raw?.kind) ? raw.kind : "daily";
  return {kind, weekdays: [...new Set((Array.isArray(raw?.weekdays) ? raw.weekdays : []).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))],
    interval: Math.max(1, Math.min(365, Math.floor(Number(raw?.interval) || 1))), start: validDay(raw?.start) ? raw.start : ""};
}
export function isScheduled(template, key) {
  if (!validDay(key)) return false;
  const s = normalizeSchedule(template.schedule);
  if (s.start && key < s.start) return false;
  if (s.kind === "weekly") return s.weekdays.includes(new Date(`${key}T12:00:00Z`).getUTCDay());
  if (s.kind === "interval") {
    if (!s.start) return false;
    return Math.round((Date.parse(`${key}T00:00:00Z`) - Date.parse(`${s.start}T00:00:00Z`)) / 86400000) % s.interval === 0;
  }
  return true;
}
export function scheduleLabel(template) {
  const s = normalizeSchedule(template.schedule);
  return s.kind === "weekly" ? `毎週 ${s.weekdays.map(n => names[n]).join("・")}` : s.kind === "interval" ? `${s.interval}日おき（${s.start}から）` : "毎日";
}
