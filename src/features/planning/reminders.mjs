import { dateKey } from "../habits/state.mjs";
export function reminderDue(settings, now = new Date()) {
  const time = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  return settings.enabled && settings.weekdays.includes(now.getDay()) && settings.time === time;
}
export function calendarReminder(settings, now = new Date()) {
  if (!settings.weekdays.length) throw Error("通知する曜日を選んでください。");
  const start = new Date(now); const [h,m] = settings.time.split(":").map(Number);
  start.setHours(h,m,0,0);
  while (start <= now || !settings.weekdays.includes(start.getDay())) start.setDate(start.getDate()+1);
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dt = `${dateKey(start).replaceAll("-","")}T${settings.time.replace(":","")}00`;
  const days = settings.weekdays.map(n=>["SU","MO","TU","WE","TH","FR","SA"][n]).join(",");
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//RPG ToDo//Reminders//JA","BEGIN:VEVENT","UID:rpg-todo-review@local",`DTSTAMP:${stamp}`,`DTSTART:${dt}`,"DURATION:PT10M",`RRULE:FREQ=WEEKLY;BYDAY=${days}`,"SUMMARY:RPG ToDo - Daily review","DESCRIPTION:Open RPG ToDo to plan and review your day.","BEGIN:VALARM","TRIGGER:PT0S","ACTION:DISPLAY","DESCRIPTION:RPG ToDo - Daily review","END:VALARM","END:VEVENT","END:VCALENDAR", ""].join("\r\n");
}
export function startReminders(getSettings, notify) {
  let busy = false;
  async function check() {
    if (busy || document.visibilityState !== "visible") return;
    const now = new Date(), settings = getSettings();
    if (!reminderDue(settings, now)) return;
    busy = true;
    try {
      const key = "rpg-todo:last-reminder", sent = `${dateKey(now)}:${settings.time}`;
      if (localStorage.getItem(key) === sent) return;
      localStorage.setItem(key,sent);
      notify("振り返りの時間です", "今日できたことを、ひとこと残しましょう。");
      if (globalThis.Notification?.permission === "granted") {
        const registration = await navigator.serviceWorker?.getRegistration();
        await registration?.showNotification("RPG ToDo：振り返りの時間", {body:"今日できたことを記録しましょう。", tag:"rpg-todo-review", data:{url:"./index.html#planning"}});
      }
    } catch { /* The in-app reminder remains usable when OS notifications fail. */ }
    finally { busy = false; }
  }
  const timer = setInterval(check, 15000);
  document.addEventListener("visibilitychange", check); check();
  return () => { clearInterval(timer); document.removeEventListener("visibilitychange", check); };
}
