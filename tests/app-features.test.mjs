import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultState,normalizeState,getProgress } from "../src/model.mjs";
import { addTask,toggleTaskState } from "../src/actions.mjs";
import { updateTaskDetails,deadlineLabel } from "../src/features/tasks/details.mjs";
import { createGameSave,normalizeGameSave,applyBattleResult } from "../src/game/storage/game-storage.mjs";
import { purchaseEquipment,equipItem,equipmentBonuses,normalizeInventory } from "../src/game/data/equipment.mjs";
import { createBattleState } from "../src/game/battle/battle-engine.mjs";
import { getStage } from "../src/game/data/stages.mjs";
import { createBackup,parseBackup,restoreBackup,RECOVERY_KEY } from "../src/features/backup/backup.mjs";
function storage(initial={}){const map=new Map(Object.entries(initial));return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test("Task edit persists deadline and notes without altering existing earned XP",()=>{
  const state=createDefaultState(),task=addTask(state,{title:"読書",difficulty:2,dueDate:"2026-09-16",note:"第2章"});
  toggleTaskState(state,task.id);const xp=state.totalXp;
  assert.ok(updateTaskDetails(state,task.id,{title:"読書完了",difficulty:5,dueDate:"2026-09-17",dueTime:"18:00",note:"メモ"}).ok);
  const loaded=normalizeState(JSON.parse(JSON.stringify(state)));
  assert.equal(loaded.totalXp,xp);assert.equal(loaded.tasks[0].earnedXp,xp);assert.equal(loaded.tasks[0].difficulty,2);
  assert.equal(loaded.tasks[0].dueDate,"2026-09-17");assert.equal(loaded.tasks[0].note,"メモ");
  toggleTaskState(loaded,task.id);assert.equal(loaded.totalXp,0);
});
test("Incomplete task editing updates reward; invalid date cannot modify the task",()=>{
  const state=createDefaultState(),task=addTask(state,{title:"掃除",difficulty:1});
  const before=JSON.stringify(state);assert.equal(updateTaskDetails(state,task.id,{title:"変更",dueDate:"2026-02-31"}).ok,false);assert.equal(JSON.stringify(state),before);
  updateTaskDetails(state,task.id,{title:"大掃除",difficulty:3,dueDate:"2026-09-15"});
  toggleTaskState(state,task.id);assert.equal(state.totalXp,task.reward);assert.ok(task.reward>10);
});
test("Deadlines use local dates and never flag completed tasks",()=>{
  const now=new Date(2026,8,14,12,0);
  assert.equal(deadlineLabel({dueDate:"2026-09-14",dueTime:"11:00"},now).overdue,true);
  assert.equal(deadlineLabel({dueDate:"2026-09-14",dueTime:"13:00"},now).overdue,false);
  assert.equal(deadlineLabel({dueDate:"2026-09-13",completed:true},now).overdue,false);
  assert.equal(deadlineLabel({dueDate:"2026-09-14"},now).overdue,false);
});
test("Equipment purchase spends GOLD once and ownership survives battle saves",()=>{
  const save=createGameSave();save.gold=100;
  assert.ok(purchaseEquipment(save,"bronze-blade").ok);assert.equal(save.gold,55);
  assert.equal(purchaseEquipment(save,"bronze-blade").ok,false);assert.equal(save.gold,55);
  const result=applyBattleResult(save,{status:"victory",stageLevel:1,goldReward:9});
  assert.equal(result.save.gold,64);assert.deepEqual(result.save.inventory.owned,["bronze-blade"]);
  assert.equal(result.save.inventory.equipped.weapon,"bronze-blade");
});
test("Equipment does not change PLAYER LEVEL, and unowned equipment grants no bonuses",()=>{
  const save=createGameSave();save.gold=100;
  purchaseEquipment(save,"bronze-blade");purchaseEquipment(save,"travel-cloak");
  const level=getProgress(245).level,battle=createBattleState(getStage(1),level,equipmentBonuses(save.inventory));
  assert.equal(battle.player.level,3);assert.equal(battle.player.attack,8+3*4+3);assert.equal(battle.player.maxHp,60+3*15+15);
  assert.equal(equipItem(save,"astral-blade").ok,false);
  assert.deepEqual(equipmentBonuses({owned:[],equipped:{weapon:"astral-blade"}}),{attack:0,hp:0});
  assert.deepEqual(normalizeGameSave({gold:1,wins:1,losses:0}).inventory,normalizeInventory(null));
});
test("Insufficient GOLD and unknown purchases never spend currency",()=>{
  const save=createGameSave();save.gold=30;const before=JSON.stringify(save);
  assert.equal(purchaseEquipment(save,"moon-blade").ok,false);assert.equal(save.gold,30);
  assert.equal(purchaseEquipment(save,"missing").ok,false);assert.equal(JSON.stringify(save),before);
});
test("Backup restores exact saved values, including daily history and equipment",()=>{
  const todo=createDefaultState();todo.totalXp=250;todo.daily.history=[{id:"yesterday",title:"昨日の習慣",completed:true}];
  const game=createGameSave();game.gold=80;purchaseEquipment(game,"travel-cloak");
  const from=storage({"rpg-todo:v1":JSON.stringify(todo),"rpg-todo:game:v1":JSON.stringify(game)});
  const text=createBackup(from),target=storage({"unrelated-app":"keep"});
  const summary=restoreBackup(text,target);assert.equal(summary.xp,250);assert.equal(summary.items,1);
  for(const key of ["rpg-todo:v1","rpg-todo:game:v1"])assert.equal(target.getItem(key),from.getItem(key));
  assert.equal(target.getItem("unrelated-app"),"keep");assert.ok(target.getItem(RECOVERY_KEY));
});
test("Malformed or foreign backup cannot erase existing data",()=>{
  const target=storage({"rpg-todo:v1":"original"});const before=[...target.map];
  for(const text of ["not json",'{"version":9}',JSON.stringify({format:"rpg-todo-backup",version:1,records:{"other-app":"x"}})])assert.throws(()=>restoreBackup(text,target));
  assert.deepEqual([...target.map],before);
});
test("A mid-restore storage failure rolls both data keys back",()=>{
  const originalTodo=JSON.stringify(createDefaultState()),originalGame=JSON.stringify(createGameSave());
  const target=storage({"rpg-todo:v1":originalTodo,"rpg-todo:game:v1":originalGame});
  const changed=createDefaultState();changed.totalXp=900;
  const backup=createBackup(storage({"rpg-todo:v1":JSON.stringify(changed),"rpg-todo:game:v1":originalGame}));
  const set=target.setItem;let fail=true;
  target.setItem=(key,value)=>{if(key==="rpg-todo:game:v1"&&fail){fail=false;throw Error("quota");}set(key,value);};
  assert.throws(()=>restoreBackup(backup,target),/元の記録/);
  assert.equal(target.getItem("rpg-todo:v1"),originalTodo);assert.equal(target.getItem("rpg-todo:game:v1"),originalGame);
  assert.equal(parseBackup(target.getItem(RECOVERY_KEY)).summary.xp,0);
});
