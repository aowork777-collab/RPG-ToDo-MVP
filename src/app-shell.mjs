import { bindBackupControls } from "./features/backup/ui.mjs";
bindBackupControls();
const installButton=document.getElementById("installApp"),offlineButton=document.getElementById("prepareOffline"),updateButton=document.getElementById("checkUpdate"),status=document.getElementById("appStatus");
const show=message=>{if(status)status.textContent=message;};
let installPrompt=null,registration=null;
const root=new URL("../",import.meta.url);
const enabledKey="rpg-todo:offline-enabled";
window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();installPrompt=event;if(installButton)installButton.textContent="アプリをインストール";
});
window.addEventListener("appinstalled",()=>{installPrompt=null;show("インストールしました。ホーム画面やアプリ一覧から起動できます。");});
async function register() {
  if(!("serviceWorker" in navigator)||!window.isSecureContext)throw Error("この環境ではオフライン機能を使えません。PCのlocalhost、またはHTTPSで開いてください。");
  registration ||= await navigator.serviceWorker.register(new URL("sw.js",root),{scope:root.pathname,updateViaCache:"none"});
  return registration;
}
async function readyWorker(reg) {
  if(reg.active)return reg.active;
  const worker=reg.installing||reg.waiting;
  if(!worker)throw Error("準備が完了していません。もう一度試してください。");
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{worker.removeEventListener("statechange",check);reject(Error("準備に時間がかかっています。通信を確認してもう一度試してください。"));},30000);
    function check(){
      if(worker.state==="activated"){clearTimeout(timer);worker.removeEventListener("statechange",check);resolve();}
      if(worker.state==="redundant"){clearTimeout(timer);worker.removeEventListener("statechange",check);reject(Error("必要なファイルを保存できませんでした。通信を確認してください。"));}
    }
    worker.addEventListener("statechange",check);check();
  });
  return reg.active||worker;
}
installButton?.addEventListener("click",async()=>{
  if(installPrompt){
    const prompt=installPrompt;installPrompt=null;await prompt.prompt();
    const choice=await prompt.userChoice;show(choice.outcome==="accepted"?"インストールを受け付けました。":"インストールはいつでも行えます。");
  }else if(matchMedia("(display-mode: standalone)").matches)show("すでにアプリとして起動しています。");
  else show("PCのChrome・Edge：アドレスバーまたはブラウザメニューの「インストール」を選択。\niPhone・iPad：共有メニューの「ホーム画面に追加」を選択。\n項目が出ない場合は、対応ブラウザとHTTPSまたはPCのlocalhostで開いてください。");
});
offlineButton?.addEventListener("click",async()=>{
  offlineButton.disabled=true;show("オフライン用のデータを準備しています…");
  try{
    const reg=await register(),worker=await readyWorker(reg);
    const result=await new Promise((resolve,reject)=>{
      const channel=new MessageChannel();
      let timer=setTimeout(()=>{channel.port1.close();reject(Error("保存がタイムアウトしました。もう一度試してください。"));},120000);
      channel.port1.onmessage=event=>{
        if(event.data.type==="progress")show("オフライン用に保存中 "+event.data.completed+" / "+event.data.total);
        if(event.data.type==="done"){clearTimeout(timer);channel.port1.close();resolve(event.data);}
      };
      worker.postMessage({type:"CACHE_ALL"},[channel.port2]);
    });
    if(!result.ok)throw Error("一部のファイルを保存できませんでした。通信や保存容量を確認して再実行してください。");
    localStorage.setItem(enabledKey,"true");show("オフラインの準備ができました。タスクとゲームを通信なしで開けます。");
  }catch(error){show(error.message);}finally{offlineButton.disabled=false;}
});
updateButton?.addEventListener("click",async()=>{
  updateButton.disabled=true;
  try{
    const reg=await register();await reg.update();
    if(reg.waiting){
      if(confirm("新しい版を適用するため、この設定画面を再読み込みしますか？")){
        navigator.serviceWorker.addEventListener("controllerchange",()=>location.reload(),{once:true});reg.waiting.postMessage({type:"ACTIVATE"});
      }
    }else show("更新確認を実行しました。新しい版の準備中は、少し待って再度確認してください。オフライン保存も更新できます。");
  }catch(error){show(error.message);}finally{updateButton.disabled=false;}
});
try{
  // Local development remains uncached until the user explicitly enables offline mode.
  if(localStorage.getItem(enabledKey)==="true")register().catch(error=>show(error.message));
}catch{}
if(status && !navigator.onLine)show("現在オフラインです。保存済みの機能と記録を利用できます。");
