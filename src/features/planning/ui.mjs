import { el, button, field, selectField, submit } from "../habits/dom.mjs";
import { dateKey, daySummary } from "../habits/state.mjs";
import { recentTasks, parseBulk, reviewTasks, saveReview } from "./state.mjs";
import { calendarReminder } from "./reminders.mjs";
import { addTask } from "../../actions.mjs";

export function mountPlanning({getState, commit, notify}) {
  const root = document.getElementById("planning");
  const dialog = el("dialog", "quest-dialog planning-dialog");
  dialog.setAttribute("aria-labelledby", "planningTitle"); document.body.append(dialog);
  let opener;
  dialog.addEventListener("close",()=>opener?.focus());
  function open(title, build) {
    opener=document.activeElement; dialog.replaceChildren();
    const head=el("div","dialog-header"), heading=el("h2","",title); heading.id="planningTitle";
    head.append(heading,button("閉じる",()=>dialog.close())); dialog.append(head);
    const message=el("p","planning-message"); message.setAttribute("role","status");
    const body=el("div","hub-form"); dialog.append(body,message);
    build(body, text=>{message.textContent=text;}); dialog.showModal();
  }
  function transaction(change) { return commit(change); }
  function history() { open("履歴からワンタップ追加", (body, status)=>{
    body.append(el("p","muted","最近20種類のタスクを再利用できます。削除済みの達成履歴は難易度「ふつう」で追加します。古い期限と完了状態は引き継ぎません。"));
    const search=field("履歴を検索","historySearch","",{type:"search"}), list=el("div","planning-history"); body.append(search,list);
    function draw() {
      list.replaceChildren(); const term=search.querySelector("input").value.trim();
      const rows=recentTasks(getState()).filter(t=>t.title.includes(term));
      if(!rows.length) list.append(el("p","muted","該当する履歴はありません。タスクを追加すると、ここから再利用できます。"));
      for(const task of rows) {
        const b=button(`${task.title} を追加`,()=>{
          if(transaction(s=>addTask(s,{title:task.title,difficulty:task.difficulty}))) {status(`「${task.title}」を追加しました。`); b.disabled=true; b.textContent=`追加済み：${task.title}`;}
          else status("保存できませんでした。もう一度お試しください。");
        }); list.append(b);
      }
    } search.addEventListener("input",draw); draw();
  }); }
  function bulk() { open("まとめて追加",(body,status)=>{
    const form=el("form","hub-form"), input=field("1行に1つのタスク","bulk","",{multiline:true,max:10000,placeholder:"本を1ページ読む\n洗濯する\n明日の準備"});
    const preview=el("ol","planning-preview"), add=submit("内容を確認"); let approved=null;
    form.append(input,el("p","muted","最大50件。すべて難易度「ふつう」、完了時20 XPで追加します。"),preview,add); body.append(form);
    input.addEventListener("input",()=>{approved=null;preview.replaceChildren();add.textContent="内容を確認";});
    form.addEventListener("submit",event=>{
      event.preventDefault();
      try {
        const titles=parseBulk(input.querySelector("textarea").value);
        if(!approved) {approved=titles;preview.replaceChildren(...titles.map(t=>el("li","",t)));add.textContent=`${titles.length}件を追加`;status("内容を確認してから追加してください。同じ名前の行も別のタスクになります。");return;}
        if(transaction(s=>approved.forEach(title=>addTask(s,{title,difficulty:2})))) {dialog.close();notify(`${approved.length}件のタスクを追加しました`,"XPは完了したときに獲得します。");}
        else status("保存できませんでした。入力内容は残っています。");
      } catch(error) {status(error.message);}
    });
  }); }
  function review() { open("一日の振り返り",(body,status)=>{
    const date=field("振り返る日","day",dateKey(),{type:"date",required:true}); date.querySelector("input").max=dateKey();
    const area=el("div","hub-form"); body.append(date,area);
    function draw() {
      const key=date.querySelector("input").value, state=getState(); area.replaceChildren();
      if(!key||key>dateKey()) return;
      const previous=state.planning.reviews[key], summary=daySummary(state.habits,key);
      area.append(el("strong","",`${summary.count}件達成 / ${summary.xp} XP`));
      const form=el("form","hub-form"); const choices=[];
      for(const task of reviewTasks(state,key)) {
        const row=selectField(task.title,`choice-${choices.length}`,[["keep","未完了のままにする"],["skip","今日はあえて休む"],["tomorrow","翌日に回す"]],previous?.decisions.find(d=>d.id===task.id)?.choice||"keep");
        choices.push({id:task.id,node:row.querySelector("select")}); form.append(row);
      }
      for(const d of previous?.decisions||[]) if(!choices.some(c=>c.id===d.id)) form.append(el("p","muted",`${d.title}：${d.choice==="tomorrow"?"翌日に回した":d.choice==="skip"?"休むと決めた":"記録済み"}`));
      form.append(field("できたこと・明日の自分へ","note",previous?.note||"",{multiline:true,max:600}),el("p","muted","休む・繰り越すだけではXPは増えません。定期タスクを翌日に回すと、通常タスクとして追加します。"),submit("振り返りを保存"));
      form.addEventListener("submit",e=>{e.preventDefault();try {
        if(transaction(s=>saveReview(s,key,new FormData(form).get("note"),Object.fromEntries(choices.map(c=>[c.id,c.node.value]))))) {status("振り返りを保存しました。");draw();}
        else status("保存できませんでした。入力内容は残っています。");
      } catch(error){status(error.message);}}); area.append(form);
    } date.addEventListener("change",draw); draw();
  }); }
  function reminders() { open("自分で決める通知",(body,status)=>{
    const r=getState().planning.reminder, form=el("form","hub-form");
    const enabled=el("label","hub-check"), check=el("input"); check.type="checkbox";check.checked=r.enabled;enabled.append(check,el("span","","タスク画面を開いている間に知らせる"));
    const time=field("通知する時刻","time",r.time,{type:"time",required:true});
    const days=el("fieldset","planning-weekdays");days.append(el("legend","","通知する曜日"));
    for(const [i,name] of ["日","月","火","水","木","金","土"].entries()){const label=el("label"),c=el("input");c.type="checkbox";c.value=i;c.checked=r.weekdays.includes(i);label.append(c,el("span","",name));days.append(label);}
    const read=()=>({enabled:check.checked,time:time.querySelector("input").value,weekdays:[...days.querySelectorAll("input:checked")].map(n=>Number(n.value))});
    const validate=()=>{if(!form.reportValidity()) return false;if(!read().weekdays.length){status("曜日を1つ以上選んでください。");return false;}return true;};
    form.append(enabled,time,days,submit("通知設定を保存"));
    form.addEventListener("submit",e=>{e.preventDefault();if(validate())status(transaction(s=>{s.planning.reminder=read();})?"通知設定を保存しました。":"保存できませんでした。");});
    body.append(el("p","muted","この画面で設定する通知は、この端末の現地時刻を使います。タスク画面を開いていない間は下のカレンダー登録を利用してください。"),form,
      button("端末の通知を許可",async()=>{if(!globalThis.Notification){status("このブラウザは通知に対応していません。カレンダー登録をご利用ください。");return;}try{const p=await Notification.requestPermission();status(p==="granted"?"端末通知を許可しました。上の設定を保存してください。":"通知は許可されていません。ブラウザの設定から変更できます。");}catch{status("端末通知を設定できませんでした。カレンダー登録をご利用ください。");}}),
      button("カレンダー用ファイルを保存",()=>{if(!validate())return;const blob=new Blob([calendarReminder(read())],{type:"text/calendar;charset=utf-8"}),url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download="rpg-todo-reminder.ics";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status("保存したファイルを端末のカレンダーに読み込んでください。通知時刻と繰り返しをご確認ください。");}),
      el("p","muted","カレンダーに読み込んだ予定は、アプリの設定を変えても自動更新されません。停止や変更はカレンダー側でも行ってください。端末やカレンダーの通知設定によっては通知されない場合があります。"));
  }); }
  root.append(button("履歴から追加",history),button("まとめて追加",bulk),button("一日の振り返り",review),button("通知を設定",reminders));
}
