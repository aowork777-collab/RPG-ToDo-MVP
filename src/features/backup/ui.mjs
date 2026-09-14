import { createBackup,parseBackup,restoreBackup,RECOVERY_KEY } from "./backup.mjs";
function download(text,name) {
  const url=URL.createObjectURL(new Blob([text],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export function bindBackupControls() {
  const exportButton=document.getElementById("exportBackup");if(!exportButton)return;
  const status=document.getElementById("backupStatus"),input=document.getElementById("importBackup"),recoveryButton=document.getElementById("exportRecovery");
  const show=message=>{status.textContent=message;};
  exportButton.addEventListener("click",()=>{try{download(createBackup(),"rpg-todo-backup-"+new Date().toISOString().slice(0,10)+".json");show("バックアップを書き出しました。");}catch(error){show(error.message);}});
  recoveryButton.addEventListener("click",()=>{try{const text=localStorage.getItem(RECOVERY_KEY);if(!text){show("復元前の記録はまだありません。");return;}download(text,"rpg-todo-recovery.json");}catch(error){show(error.message);}});
  input.addEventListener("change",async()=>{
    const file=input.files?.[0];if(!file)return;
    try{
      if(file.size>5_000_000)throw Error("5MB以下のJSONを選んでください。");
      const text=await file.text(),{summary}=parseBackup(text);
      if(!window.confirm("タスク "+summary.tasks+" 件 / "+summary.xp+" XP / "+summary.gold+" GOLD / 装備 "+summary.items+" 個\n現在の記録をこのバックアップで置き換えますか？"))return;
      const commit=()=>restoreBackup(text);
      if(navigator.locks?.request)await navigator.locks.request("rpg-todo:campaign-save",commit);else commit();
      show("復元しました。タスク・バトル画面を開き直すと反映されます。");recoveryButton.hidden=false;
    }catch(error){show(error.message);}finally{input.value="";}
  });
  try{recoveryButton.hidden=!localStorage.getItem(RECOVERY_KEY);}catch{recoveryButton.hidden=true;}
}
