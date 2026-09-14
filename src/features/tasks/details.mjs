import { calculateTaskReward, clampDifficulty } from "../../model.mjs";
import { getLocalDateKey } from "../daily/state.mjs";

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value ? value : "";
}
export function updateTaskDetails(state, id, values) {
  const task = state.tasks.find(task => task.id === id);
  const title = String(values.title || "").trim().slice(0,60);
  if (!task || !title) return { ok:false, message:"タスク名を入力してください。" };
  const dueDate = values.dueDate ? validDate(values.dueDate) : "";
  if (values.dueDate && !dueDate) return { ok:false, message:"期限の日付を確認してください。" };
  const dueTime = String(values.dueTime || "");
  if (dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) return { ok:false, message:"期限の時刻を確認してください。" };
  task.title=title; task.note=String(values.note||"").trim().slice(0,500);
  task.dueDate=dueDate; task.dueTime=dueTime;
  // Historical earned XP must stay intact when editing an already completed task.
  if(!task.completed) { task.difficulty=clampDifficulty(values.difficulty);task.reward=calculateTaskReward(task.difficulty); }
  return {ok:true,task};
}
export function deadlineLabel(task, now=new Date()) {
  const date=validDate(task.dueDate) || (task.dailyTemplateId ? validDate(task.dateKey) : "");
  const time=task.dueTime || "";
  if(!date) return { text: time ? "期限 " + time : "", overdue:false };
  const today=getLocalDateKey(now);
  const minutes=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
  const overdue=!task.completed && (date<today || (date===today && time && time<minutes));
  return {text:(overdue?"期限超過 · ":date===today?"今日 · ":"")+date.slice(5).replace("-","/")+(time?" "+time:""),overdue:Boolean(overdue)};
}
