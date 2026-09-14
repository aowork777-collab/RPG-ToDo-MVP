import { updateTaskDetails } from "./details.mjs";
export function createTaskEditor({getState,onCommit,onRefresh=()=>{},notify}) {
  const dialog=document.createElement("dialog");
  dialog.className="quest-dialog task-editor";dialog.setAttribute("aria-labelledby","editTaskHeading");
  dialog.innerHTML=`<form id="editTaskForm"><div class="dialog-header"><h2 id="editTaskHeading">タスクを編集</h2><button type="button" data-close class="icon-button" aria-label="閉じる">×</button></div>
    <label class="field-label" for="editTitle">タスク名</label><input id="editTitle" class="text-input" name="title" required maxlength="60">
    <label class="field-label" for="editDifficulty">難易度</label><select id="editDifficulty" class="text-input" name="difficulty"><option value="1">★</option><option value="2">★★</option><option value="3">★★★</option><option value="4">★★★★</option><option value="5">★★★★★</option></select>
    <div class="editor-dates"><label>期限の日付<input class="text-input" name="dueDate" type="date"></label><label>時刻<input class="text-input" name="dueTime" type="time"></label></div>
    <label class="field-label" for="editNote">メモ</label><textarea id="editNote" class="text-input" name="note" rows="3" maxlength="500"></textarea>
    <p data-hint class="editor-hint"></p><p data-error role="alert"></p><div class="dialog-actions"><button type="button" data-close class="secondary-button">キャンセル</button><button class="primary-button" type="submit">変更を保存</button></div></form>`;
  document.body.append(dialog);
  const form=dialog.querySelector("form");let selectedId=null,opener=null;
  dialog.querySelectorAll("[data-close]").forEach(button=>button.addEventListener("click",()=>dialog.close()));
  dialog.addEventListener("close",()=>{
    const id=selectedId;selectedId=null;
    const row=Array.from(document.querySelectorAll(".quest-item")).find(node=>node.dataset.taskId===id);
    const target=opener?.isConnected?opener:row?.querySelector(".action-button")||document.getElementById("quickTaskTitle");
    target?.focus?.();
  });
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const before={...getState().tasks.find(task=>task.id===selectedId)};
    const result=updateTaskDetails(getState(),selectedId,Object.fromEntries(new FormData(form)));
    if(!result.ok){dialog.querySelector("[data-error]").textContent=result.message;return;}
    const saved=onCommit();
    if(saved?.ok===false){Object.assign(result.task,before);onRefresh();dialog.querySelector("[data-error]").textContent="保存できませんでした。入力内容はこの画面に残っています。";return;}
    dialog.close();notify("タスクを更新しました",result.task.title);
  });
  return {
    open(id) {
      const task=getState().tasks.find(task=>task.id===id);if(!task)return;
      selectedId=id;opener=document.activeElement;
      for(const key of ["title","difficulty","dueDate","dueTime","note"])form.elements[key].value=task[key]??"";
      form.elements.difficulty.disabled=task.completed;
      dialog.querySelector("[data-error]").textContent="";
      dialog.querySelector("[data-hint]").textContent=task.completed?"完了済みのタスクは、獲得済みXPと難易度を維持します。":task.dailyTemplateId?"変更は今日のタスクに反映します。明日以降の繰り返し設定は変わりません。":"難易度を変えると、完了時のXPも変わります。";
      dialog.showModal();form.elements.title.focus();
    }
  };
}
