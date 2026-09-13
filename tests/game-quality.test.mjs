import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { BattleController } from "../src/game/battle/battle-controller.mjs";
import { createPlayerState, getEnemyIntent } from "../src/game/battle/combat-rules.mjs";
import { getStage, getStageLevels, getAllEnemyImageUrls } from "../src/game/data/stages.mjs";
import { Actor } from "../src/game/entities/actor.mjs";
import { Game } from "../src/game/Game.mjs";
import { readTodoProgress } from "../src/game/bridge/todo-level.mjs";
import { loadGameSave, saveGameSave } from "../src/game/storage/game-storage.mjs";
import { PLAYER_SPRITE, PLAYER_SPRITE_URL, ARENA_IMAGE_URL } from "../src/game/config.mjs";
import { MONSTERS, getMonster } from "../src/game/data/monsters.mjs";
import { normalizeGameSave } from "../src/game/storage/game-storage.mjs";

function setup(playerLevel = 12, level = 1, options = {}) {
  const playerActor = new Actor({ id: "player", name: "YOU", level: playerLevel, x: 220, y: 412, sprite: PLAYER_SPRITE });
  const enemyActor = new Actor({ id: "slime", name: "スライム", level, x: 740, y: 412, facing: -1 });
  let finishes = 0;
  const controller = new BattleController({
    stage: getStage(level), playerLevel, playerActor, enemyActor,
    tweens: { wait: async () => {}, to: async (target, properties) => Object.assign(target, properties) },
    renderer: { addEffect() {}, addProjectile() {}, shake() {} },
    onFinish: () => finishes++, ...options,
  });
  return { controller, playerActor, enemyActor, get finishes() { return finishes; } };
}

test("ToDo XP drives player strength without writing ToDo storage", () => {
  const original = JSON.stringify({ totalXp: 1168, filter: "active", tasks: [], daily: {} });
  const values = new Map([["rpg-todo:v1", original]]);
  const writes = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes.push(key); values.set(key, value); } };
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  try {
    assert.equal(readTodoProgress().level, 12);
    assert.equal(createPlayerState(readTodoProgress().level).attack, 56);
    assert.ok(saveGameSave({ gold: 40, wins: 2, selectedStage: 7 }, storage));
    assert.equal(values.get("rpg-todo:v1"), original);
    assert.deepEqual(writes, ["rpg-todo:game:v1"]);
    values.set("rpg-todo:v1", JSON.stringify({ totalXp: 1200, tasks: [] }));
    assert.equal(readTodoProgress().level, 13);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  }
});
test("Enemy level remains freely selectable from 1 to 99", () => {
  assert.equal(getStageLevels().length, 99);
  assert.equal(getStage(99).level, 99);
  assert.equal(getStage(999).level, 99);
  assert.equal(getStage(-5).level, 1);
  const { controller } = setup(1, 99);
  assert.equal(controller.state.player.level, 1);
  assert.equal(controller.state.enemy.level, 99);
});
test("Enemies telegraph strong attacks on turns 3,6,9", () => {
  for (let turn = 1; turn <= 9; turn++) assert.equal(getEnemyIntent(turn, 10).strong, turn % 3 === 0);
});
test("Victory is rewarded once; repeated skills and finish calls are ignored", async () => {
  const fixture = setup(30, 1);
  await fixture.controller.useSkill("attack");
  assert.equal(fixture.controller.state.status, "victory");
  assert.equal(fixture.finishes, 1);
  await fixture.controller.useSkill("attack");
  await fixture.controller.finish("victory");
  assert.equal(fixture.finishes, 1);
  assert.equal(fixture.playerActor.state, "victory");
});
test("Guard reduces the forecast attack and restores MP", async () => {
  const { controller } = setup(1, 1);
  controller.state.player.mp = 0;
  const hp = controller.state.player.hp;
  await controller.useSkill("guard");
  assert.ok(hp - controller.state.player.hp <= 4);
  assert.equal(controller.state.player.mp, 8);
  assert.equal(controller.state.turn, 2);
  assert.equal(controller.state.player.guarding, false);
});
test("Healing at full HP or without MP cannot consume a turn", async () => {
  const { controller } = setup(1, 1);
  assert.equal(await controller.useSkill("heal"), false);
  controller.state.player.mp = 0;
  assert.equal(await controller.useSkill("power-slash"), false);
  assert.equal(controller.state.turn, 1);
});
test("Heal restores HP before the enemy acts", async () => {
  const { controller } = setup(10, 1);
  controller.state.player.hp = 20;
  await controller.useSkill("heal");
  assert.ok(controller.state.player.hp > 20);
  assert.equal(controller.state.player.mp, controller.state.player.maxMp - 6);
});
test("Defeat cannot produce victory rewards", async () => {
  const fixture = setup(1, 99);
  await fixture.controller.useSkill("attack");
  assert.equal(fixture.controller.state.status, "defeat");
  assert.equal(fixture.finishes, 1);
  assert.equal(fixture.playerActor.dead, true);
});
test("Concurrent clicks are locked until animation ends", async () => {
  const { controller } = setup(2, 1);
  const first = controller.useSkill("attack");
  assert.equal(await controller.useSkill("attack"), false);
  await first;
  assert.equal(controller.state.turn, 2);
});
test("Cancelled animations cannot award GOLD", async () => {
  const fixture = setup(30, 1);
  const action = fixture.controller.useSkill("attack");
  fixture.controller.cancel();
  await action;
  assert.equal(fixture.finishes, 0);
});
test("Animation errors end safely without counting a defeat", async () => {
  const fixture = setup(2, 1, { renderer: { addEffect() { throw new Error("drawing failed"); }, shake() {} } });
  await assert.rejects(fixture.controller.useSkill("attack"));
  assert.equal(fixture.controller.state.status, "error");
  assert.equal(fixture.controller.locked, false);
  assert.equal(fixture.finishes, 0);
});
test("An existing battle cannot be restarted during an animation", () => {
  let cleared = false;
  Game.prototype.startBattle.call({ ready: true, controller: { locked: true }, tweens: { clear() { cleared = true; } } });
  assert.equal(cleared, false);
});
test("Sprite rows match combat state; reduced motion disables shaking", () => {
  const { playerActor } = setup();
  playerActor.attack(); playerActor.update(0.2);
  assert.equal(playerActor.getSpriteFrame().row, 2);
  playerActor.setState("run"); assert.equal(playerActor.getSpriteFrame().row, 1);
  playerActor.reducedMotion = true; playerActor.hurt();
  assert.equal(playerActor.getDrawTransform(5).x, playerActor.x);
});
test("Save failures are reported and old game balances survive normalization", () => {
  const storage = { getItem: () => JSON.stringify({ gold: 400, wins: 3, losses: 1, highestClearedLevel: 7, selectedStage: 6 }) };
  assert.equal(loadGameSave(storage).gold, 400);
  const warn = console.warn; console.warn = () => {};
  try { assert.equal(saveGameSave({}, { setItem() { throw new Error("quota"); } }), false); }
  finally { console.warn = warn; }
});
test("All configured game artwork resolves within the repository", () => {
  for (const url of [PLAYER_SPRITE_URL, ARENA_IMAGE_URL, ...getAllEnemyImageUrls()]) assert.ok(existsSync(new URL(url)), url);
});
test("The original ToDo files are byte-for-byte unchanged", () => {
  const root = new URL("../", import.meta.url);
  const paths = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD"], { cwd: root, encoding: "utf8" }).trim().split("\n");
  for (const path of paths) {
    if (path === "index.html" || path === "server.js" || (path.startsWith("styles/") && path !== "styles/game.css") || (path.startsWith("src/") && !path.startsWith("src/game/") && path !== "src/battle-app.mjs")) {
      assert.deepEqual(readFileSync(new URL(path, root)), execFileSync("git", ["show", "HEAD:" + path], { cwd: root }), path);
    }
  }
});

test("All ten species can be selected at level 1 or 99", () => {
  assert.equal(MONSTERS.length, 10);
  for (const monster of MONSTERS) {
    for (const level of [1, 99]) assert.equal(getStage(level, monster.id).monster.id, monster.id);
    assert.equal(monster.sprite.frames.length, 12);
    const data = readFileSync(new URL(monster.imageUrl));
    const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
    for (const [x,y,w,h] of monster.sprite.frames) {
      assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x+w <= width && y+h <= height);
    }
    const actor = new Actor({ sprite: monster.sprite });
    actor.update(.25); assert.equal(actor.getSpriteFrame().column, 1);
    actor.attack(); assert.equal(actor.getSpriteFrame().row, 1);
    actor.hurt(); assert.equal(actor.getSpriteFrame().row, 2);
    actor.dead = true; actor.setState("dead"); actor.update(1);
    assert.equal(actor.getSpriteFrame().column, 3);
  }
});
test("Species choices and codex migrate without resetting old balances", () => {
  const saved = normalizeGameSave({ gold: 400, wins: 3, selectedMonster: "mimic", defeatedMonsters: { mimic: 2, wolf: -3 } });
  assert.equal(saved.gold, 400); assert.equal(saved.wins, 3);
  assert.equal(saved.selectedMonster, "mimic"); assert.equal(saved.defeatedMonsters.mimic, 2);
  assert.equal(saved.defeatedMonsters.wolf, 0);
  assert.equal(normalizeGameSave({ selectedMonster: "missing" }).selectedMonster, "auto");
});
test("Each monster completes a battle without animation or range errors", async () => {
  for (const monster of MONSTERS) {
    const fixture = setup(10, 10, { stage: getStage(10, monster.id) });
    for (let turn = 0; turn < 80 && fixture.controller.state.status === "playing"; turn++) await fixture.controller.useSkill("attack");
    assert.notEqual(fixture.controller.state.status, "playing", monster.id);
    assert.equal(fixture.finishes, 1, monster.id);
    assert.ok(fixture.controller.state.player.hp >= 0);
    assert.ok(fixture.controller.state.enemy.hp >= 0);
  }
});
test("Enemy guard halves only the next player hit", async () => {
  const { controller } = setup(1, 10, { stage: getStage(10, "frost-golem") });
  await controller.runEnemyTurn();
  assert.equal(controller.state.enemy.guarding, true);
  const hp = controller.state.enemy.hp;
  await controller.runPlayerAttack({ power: 1, name: "攻撃" });
  assert.ok(hp - controller.state.enemy.hp <= 6);
  assert.equal(controller.state.enemy.guarding, false);
});
test("Guard applies to every hit in a combo", async () => {
  const { controller } = setup(30, 10, { stage: getStage(10, "goblin") });
  controller.state.turn = 2; controller.state.player.guarding = true;
  const hp = controller.state.player.hp;
  const intent = getEnemyIntent(2, controller.state.enemy.attack, getMonster("goblin"), controller.state.enemy);
  await controller.runEnemyTurn();
  assert.ok(hp - controller.state.player.hp <= intent.max / 2);
  assert.equal(controller.state.player.guarding, false);
});
test("Drain and phoenix healing never exceed enemy max HP", async () => {
  for (const id of ["demon", "phoenix"]) {
    const { controller } = setup(30, 10, { stage: getStage(10, id) });
    controller.state.enemy.hp -= 2; controller.state.turn = id === "demon" ? 2 : 3;
    const hp = controller.state.enemy.hp;
    await controller.runEnemyTurn();
    assert.ok(controller.state.enemy.hp > hp);
    assert.ok(controller.state.enemy.hp <= controller.state.enemy.maxHp);
  }
});
test("Boss rage changes predicted attack by 15% below 40% HP", () => {
  const boss = getMonster("dragon");
  const normal = getEnemyIntent(1, 100, boss, { hp: 41, maxHp: 100 });
  const rage = getEnemyIntent(1, 100, boss, { hp: 40, maxHp: 100 });
  assert.equal(normal.enraged, false); assert.equal(rage.enraged, true);
  assert.equal(rage.multiplier, normal.multiplier * 1.15);
});
test("GOLD and codex rewards remain isolated from ToDo", () => {
  const values = new Map([["rpg-todo:v1", "unchanged"]]);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v) } });
  try {
    const game = { stage: getStage(1, "mimic"), save: { selectedMonster: "mimic" }, todoProgress: { level: 1 }, ui: { renderStats() {} }, persist() { saveGameSave(this.save); } };
    Game.prototype.finishBattle.call(game, { status: "victory", goldReward: game.stage.goldReward });
    assert.equal(loadGameSave().defeatedMonsters.mimic, 1);
    assert.equal(loadGameSave().selectedMonster, "mimic");
    assert.equal(values.get("rpg-todo:v1"), "unchanged");
  } finally { if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor); else delete globalThis.localStorage; }
});

test("Rapid stage changes cannot display an older loaded monster", async () => {
  const pending = [];
  const shown = [];
  const game = {
    ready: true, selectionRequest: 0, save: { selectedMonster: "slime", selectedStage: 1 }, todoProgress: { level: 1 },
    assets: { loadImage: () => new Promise(resolve => pending.push(resolve)) },
    tweens: { clear() {} }, renderer: { setScene(stage) { shown.push(stage.monster.id); } },
    ui: { elements: { startBattleButton: {} }, renderStage() {}, showStageSelection() {}, renderStats() {}, message() {} },
    createActors() {},
  };
  const first = Game.prototype.selectStage.call(game, 1, false);
  game.save.selectedMonster = "phoenix";
  const second = Game.prototype.selectStage.call(game, 99, false);
  pending[1]({}); await second; pending[0]({}); await first;
  assert.deepEqual(shown, ["phoenix"]);
  assert.equal(game.stage.level, 99); assert.equal(game.loadingStage, false);
});
