export const RECORD_KEYS=["rpg-todo:v1","rpg-todo:game:v1"];
export const RECOVERY_KEY="rpg-todo:restore-recovery:v1";
const object=value=>value!==null && typeof value==="object" && !Array.isArray(value);
function checkValue(key,raw) {
  if(raw===null)return null;
  if(typeof raw!=="string")throw Error("保存データの形式が正しくありません。");
  let value;try{value=JSON.parse(raw);}catch{throw Error("保存データを読み取れません。");}
  if(!object(value))throw Error("保存データがオブジェクトではありません。");
  const nonnegative=v=>Number.isFinite(v)&&v>=0&&Number.isSafeInteger(v);
  if(key===RECORD_KEYS[0]){
    if(!nonnegative(value.totalXp)||!Array.isArray(value.tasks))throw Error("タスクまたはXPの形式が正しくありません。");
    if(value.tasks.some(t=>!object(t)||typeof t.title!=="string"||!t.title.trim()||typeof t.id!=="string"))throw Error("タスクの内容を確認してください。");
    if(value.daily!==undefined && (!object(value.daily)||!Array.isArray(value.daily.templates)||!Array.isArray(value.daily.history)))throw Error("毎日の設定の形式が正しくありません。");
  }else{
    if(!nonnegative(value.gold)||!nonnegative(value.wins)||!nonnegative(value.losses))throw Error("ゲーム記録の形式が正しくありません。");
    if(value.inventory!==undefined && (!object(value.inventory)||!Array.isArray(value.inventory.owned)||!object(value.inventory.equipped)))throw Error("装備データの形式が正しくありません。");
  }
  return value;
}
export function parseBackup(text) {
  if(typeof text!=="string"||text.length>5_000_000)throw Error("バックアップは5MB以下のJSONを選んでください。");
  let file;try{file=JSON.parse(text);}catch{throw Error("JSONファイルを読み取れません。");}
  if(file?.format!=="rpg-todo-backup"||file.version!==1||!object(file.records))throw Error("このアプリから書き出したバックアップを選んでください。");
  if(Object.keys(file.records).length!==RECORD_KEYS.length||!RECORD_KEYS.every(key=>Object.hasOwn(file.records,key)))throw Error("バックアップの項目が不足しています。");
  const values=RECORD_KEYS.map(key=>checkValue(key,file.records[key]));
  return {file,summary:{tasks:values[0]?.tasks.length||0,xp:values[0]?.totalXp||0,gold:values[1]?.gold||0,items:values[1]?.inventory?.owned.length||0}};
}
export function createBackup(storage=globalThis.localStorage) {
  const records=Object.fromEntries(RECORD_KEYS.map(key=>[key,storage.getItem(key)]));
  const text=JSON.stringify({format:"rpg-todo-backup",version:1,createdAt:new Date().toISOString(),records},null,2);
  parseBackup(text);return text;
}
export function restoreBackup(text,storage=globalThis.localStorage) {
  const {file,summary}=parseBackup(text);
  const previous=Object.fromEntries(RECORD_KEYS.map(key=>[key,storage.getItem(key)]));
  const recovery=JSON.stringify({format:"rpg-todo-backup",version:1,createdAt:new Date().toISOString(),records:previous});
  // Save a recovery snapshot before changing either data key.
  try{storage.setItem(RECOVERY_KEY,recovery);}catch{throw Error("復元前の記録を保存できないため、復元を中止しました。");}
  const write=(key,value)=>value===null?storage.removeItem(key):storage.setItem(key,value);
  try{for(const key of RECORD_KEYS)write(key,file.records[key]);}
  catch{
    try{for(const key of RECORD_KEYS)write(key,previous[key]);}
    catch{throw Error("復元と巻き戻しに失敗しました。「復元前の記録を保存」から保護された記録を取り出してください。");}
    throw Error("保存容量などの理由で復元できませんでした。元の記録に戻しました。");
  }
  return summary;
}
