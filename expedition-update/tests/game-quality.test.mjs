import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { getStage } from "../src/game/data/stages.mjs";
import { MONSTERS } from "../src/game/data/monsters.mjs";
import { createBattleState, resolvePlayerAction, resolveEnemyAction, completeTurn, previewOrder, canUseSkill, selectTarget } from "../src/game/battle/battle-engine.mjs";
import { createPlayerState } from "../src/game/battle/combat-rules.mjs";
import { normalizeGameSave, applyBattleResult, getCurrentStage, isCampaignComplete, saveGameSave } from "../src/game/storage/game-storage.mjs";
import { BattleController } from "../src/game/battle/battle-controller.mjs";
import { readTodoProgress } from "../src/game/bridge/todo-level.mjs";
import { Actor } from "../src/game/entities/actor.mjs";
import { PLAYER_SPRITE, PLAYER_SPRITE_URL, ARENA_IMAGE_URL } from "../src/game/config.mjs";
const fixed=()=>.5;
function fixture(level=1,playerLevel=1,overrides={}) {
  const stage=getStage(level); let finishes=0;
  const controller=new BattleController({
    stage,playerLevel,
    playerActor:new Actor({id:"player",sprite:PLAYER_SPRITE,x:220,y:412}),
    enemyActors:stage.enemies.map(e=>new Actor({id:e.id,sprite:e.sprite,x:735,y:412})),
    tweens:{wait:async()=>{},to:async(target,props)=>Object.assign(target,props)},
    renderer:{addEffect(){},addProjectile(){},shake(){}},onFinish:()=>finishes++,...overrides,
  });
  return {controller,get finishes(){return finishes;}};
}
test("Exactly every fifth stage is a boss; stage inputs cannot exceed campaign bounds",()=>{
  let bosses=0;
  for(let n=1;n<=100;n++){const stage=getStage(n);assert.equal(stage.isBoss,n%5===0);assert.equal(stage.level,n);if(stage.isBoss){bosses++;assert.equal(stage.enemies.length,1);}}
  assert.equal(bosses,20);assert.equal(getStage(999).level,100);assert.equal(getStage(NaN).level,1);
});
test("Legacy balances survive; free-selected levels never skip the new campaign",()=>{
  const save=normalizeGameSave({gold:420,wins:30,losses:2,highestClearedLevel:99,selectedStage:99,defeatedMonsters:{dragon:3}});
  assert.equal(save.gold,420);assert.equal(save.wins,30);assert.equal(save.defeatedMonsters.dragon,3);
  assert.equal(getCurrentStage(save),1);assert.equal(save.highestClearedLevel,99);
});
test("Winning advances exactly one stage and duplicate or skipped claims cannot pay GOLD",()=>{
  const raw={gold:50,campaignVersion:1,clearedStage:0};
  const result={stageLevel:1,status:"victory",goldReward:9,monsterIds:["slime"]};
  const first=applyBattleResult(raw,result);assert.equal(first.save.gold,59);assert.equal(getCurrentStage(first.save),2);
  const twice=applyBattleResult(first.save,result);assert.equal(twice.applied,false);assert.equal(twice.save.gold,59);
  assert.equal(applyBattleResult(first.save,{...result,stageLevel:50}).applied,false);
});
test("A defeat never advances the campaign or reduces balances",()=>{
  const result=applyBattleResult({campaignVersion:1,clearedStage:4,gold:100},{stageLevel:5,status:"defeat"});
  assert.equal(result.save.clearedStage,4);assert.equal(result.save.gold,100);assert.equal(result.save.losses,1);
});
test("The final boss completes the campaign without offering stage 101",()=>{
  const {save}=applyBattleResult({campaignVersion:1,clearedStage:99},{stageLevel:100,status:"victory",goldReward:100});
  assert.ok(isCampaignComplete(save));assert.equal(getCurrentStage(save),100);
  assert.equal(applyBattleResult(save,{stageLevel:100,status:"victory",goldReward:100}).applied,false);
});
test("ToDo XP determines player strength and game saves write only the game key",()=>{
  const values=new Map([["rpg-todo:v1",JSON.stringify({totalXp:1168,tasks:[],daily:{}})]]);
  const original=values.get("rpg-todo:v1"),writes=[];
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>{writes.push(k);values.set(k,v);}}});
  try{assert.equal(readTodoProgress().level,12);assert.equal(createPlayerState(12).attack,56);saveGameSave({gold:50});assert.equal(values.get("rpg-todo:v1"),original);assert.deepEqual(writes,["rpg-todo:game:v1"]);}
  finally{if(descriptor)Object.defineProperty(globalThis,"localStorage",descriptor);else delete globalThis.localStorage;}
});
test("SP costs are enforced and normal attacks restore SP only once",()=>{
  const s=createBattleState(getStage(20),1);s.sp=0;
  assert.equal(resolvePlayerAction(s,"power-slash",fixed),null);
  const energy=s.player.energy;resolvePlayerAction(s,"attack",fixed);assert.equal(s.sp,1);assert.equal(s.player.energy,energy+25);
  s.sp=5;resolvePlayerAction(s,"attack",fixed);assert.equal(s.sp,5);
});
test("A mismatching element does not damage toughness; matching weakness causes break and delay",()=>{
  const s=createBattleState(getStage(5),1),enemy=s.enemies[0]; // orc: physical
  const toughness=enemy.toughness;resolvePlayerAction(s,"power-slash",fixed);assert.equal(enemy.toughness,toughness);
  enemy.toughness=20;const next=enemy.nextAction;
  const result=resolvePlayerAction(s,"attack",fixed);
  assert.equal(enemy.broken,true);assert.equal(enemy.toughness,0);assert.ok(enemy.nextAction>next);assert.equal(result.events[0].broke,true);
});
test("Broken enemies use a turn recovering and cannot retaliate on that turn",()=>{
  const s=createBattleState(getStage(5),1),enemy=s.enemies[0];
  enemy.broken=true;enemy.toughness=0;s.currentActorId=enemy.id;
  const hp=s.player.hp,result=resolveEnemyAction(s,fixed);
  assert.equal(result.type,"recover");assert.equal(s.player.hp,hp);assert.equal(enemy.toughness,enemy.maxToughness);assert.equal(enemy.broken,false);
});
test("Ultimate requires energy and player turn, hits every enemy, and preserves the normal action",()=>{
  const s=createBattleState(getStage(18),5);
  assert.equal(canUseSkill(s,"ultimate"),false);s.player.energy=100;
  const result=resolvePlayerAction(s,"ultimate",fixed);
  assert.equal(result.events.length,3);assert.equal(result.consumesTurn,false);
  assert.equal(s.player.energy,0);assert.equal(s.currentActorId,"player");assert.equal(s.turn,1);assert.equal(canUseSkill(s,"ultimate"),false);
  s.player.energy=100;s.currentActorId=s.enemies[0].id;assert.equal(canUseSkill(s,"ultimate"),false);
});
test("Target selection controls the primary hit and adjacent splash",()=>{
  const s=createBattleState(getStage(18),1);
  assert.equal(selectTarget(s,s.enemies[0].id),true);
  const first=resolvePlayerAction(s,"power-slash",fixed);assert.equal(first.events.length,2);
  selectTarget(s,s.enemies[1].id);
  const second=resolvePlayerAction(s,"power-slash",fixed);assert.equal(second.events.length,3);
  assert.equal(selectTarget(s,"missing"),false);
});
test("Dead targets are excluded from action order and retargeting",()=>{
  const s=createBattleState(getStage(18),1),dead=s.enemies[0];
  dead.hp=0;assert.equal(selectTarget(s,dead.id),false);
  assert.ok(previewOrder(s).every(entry=>entry.id!==dead.id));
  assert.ok(resolvePlayerAction(s,"attack",fixed).events.every(event=>event.id!==dead.id));
});
test("Guard covers all enemies until the next player action",()=>{
  const normal=createBattleState(getStage(18),18),guarded=createBattleState(getStage(18),18);
  resolvePlayerAction(guarded,"guard",fixed);
  for(const state of [normal,guarded]){completeTurn(state);while(state.currentActorId!=="player"&&state.status==="playing"){resolveEnemyAction(state,fixed);completeTurn(state);}}
  assert.ok(normal.player.maxHp-normal.player.hp>guarded.player.maxHp-guarded.player.hp);
  assert.equal(guarded.player.guarding,false);
});
test("Healing at full HP cannot spend SP or an action",()=>{
  const s=createBattleState(getStage(1),1);
  assert.equal(resolvePlayerAction(s,"heal",fixed),null);assert.equal(s.sp,3);assert.equal(s.turn,1);
});
test("Forecasting action order never mutates combat state",()=>{
  const s=createBattleState(getStage(18),18),before=JSON.stringify(s);
  assert.equal(previewOrder(s).length,6);assert.equal(JSON.stringify(s),before);
});
test("One hundred stages finish with bounded resources using a valid command strategy",()=>{
  for(let level=1;level<=100;level++){
    const s=createBattleState(getStage(level),level);let steps=0;
    while(s.status==="playing"&&steps++<300){
      if(s.currentActorId==="player"){
        const skill=s.player.energy===100?"ultimate":s.sp&&s.player.hp<s.player.maxHp*.45?"heal":s.sp?"power-slash":"attack";
        const result=resolvePlayerAction(s,skill,fixed);assert.ok(result);if(result.consumesTurn)completeTurn(s);
      }else{resolveEnemyAction(s,fixed);completeTurn(s);}
      assert.ok(s.sp>=0&&s.sp<=5);assert.ok(s.player.energy>=0&&s.player.energy<=100);assert.ok(s.player.hp>=0&&s.player.hp<=s.player.maxHp);
      for(const enemy of s.enemies){assert.ok(enemy.hp>=0&&enemy.hp<=enemy.maxHp);assert.ok(enemy.toughness>=0&&enemy.toughness<=enemy.maxToughness);}
    }
    assert.equal(s.status,"victory","Stage "+level+" should be completable at matching player level");
  }
});
test("ToDo level one is not silently raised when facing a high-level boss",()=>{
  const s=createBattleState(getStage(100),1);
  assert.equal(s.player.level,1);assert.equal(s.player.maxHp,75);
  resolvePlayerAction(s,"attack",fixed);completeTurn(s);
  for(let n=0;n<5&&s.status==="playing";n++){
    if(s.currentActorId==="player")resolvePlayerAction(s,"attack",fixed);else resolveEnemyAction(s,fixed);completeTurn(s);
  }
  assert.equal(s.status,"defeat");
});
test("Animation locking prevents double actions and rewards only once",async()=>{
  const f=fixture(1,50);const first=f.controller.useSkill("attack");
  assert.equal(await f.controller.useSkill("attack"),false);await first;
  assert.equal(f.finishes,1);assert.equal(f.controller.state.status,"victory");
  await f.controller.finish();assert.equal(f.finishes,1);
});
test("Cancelled and failed animations cannot grant victory rewards",async()=>{
  const cancelled=fixture(1,50);const action=cancelled.controller.useSkill("attack");cancelled.controller.cancel();await action;assert.equal(cancelled.finishes,0);
  const failed=fixture(1,50,{renderer:{addEffect(){throw Error("draw failure");},shake(){}}});
  await assert.rejects(failed.controller.useSkill("attack"));assert.equal(failed.finishes,0);assert.equal(failed.controller.state.status,"error");assert.equal(failed.controller.locked,false);
});
test("Controller drives multiple enemies and returns control to player",async()=>{
  const f=fixture(18,18);await f.controller.useSkill("guard");
  assert.equal(f.controller.state.currentActorId,"player");assert.equal(f.controller.locked,false);assert.equal(f.controller.state.turn,2);
});
test("Every species has twelve valid sprite frames and all shipped art exists",()=>{
  for(const url of [PLAYER_SPRITE_URL,ARENA_IMAGE_URL,...MONSTERS.map(m=>m.imageUrl)])assert.ok(existsSync(new URL(url)));
  for(const m of MONSTERS){
    const png=readFileSync(new URL(m.imageUrl)),w=png.readUInt32BE(16),h=png.readUInt32BE(20);
    assert.equal(m.sprite.frames.length,12);
    for(const [x,y,width,height] of m.sprite.frames)assert.ok(x>=0&&y>=0&&width>0&&height>0&&x+width<=w&&y+height<=h);
    const a=new Actor({sprite:m.sprite});a.update(.25);assert.equal(a.getSpriteFrame().column,1);
  }
});
test("Original ToDo and server files are byte-for-byte unchanged",()=>{
  const root=new URL("../",import.meta.url);
  const paths=execFileSync("git",["ls-tree","-r","--name-only","HEAD"],{cwd:root,encoding:"utf8"}).trim().split("\n");
  for(const path of paths)if(path==="index.html"||path==="server.js"||(path.startsWith("styles/")&&path!=="styles/game.css")||(path.startsWith("src/")&&!path.startsWith("src/game/")&&path!=="src/battle-app.mjs")){
    assert.deepEqual(readFileSync(new URL(path,root)),execFileSync("git",["show","HEAD:"+path],{cwd:root}),path);
  }
});
