import { getSkill } from "../data/skills.mjs";
import { createPlayerState, getEnemyIntent } from "./combat-rules.mjs";

const tick = unit => 10000 / unit.speed;
export function createBattleState(stage, playerLevel, bonuses = {}) {
  return {
    status: "playing", phase: "player", turn: 1, now: 0, currentActorId: "player",
    stageLevel: stage.level, isBoss: stage.isBoss, goldReward: stage.goldReward,
    player: createPlayerState(playerLevel, bonuses), sp: 3, maxSp: 5,
    enemies: stage.enemies.map(e => ({ ...e, hp: e.maxHp, guarding: false, actionCount: 1, nextAction: 5000 / e.speed })),
    selectedTargetId: stage.enemies[0].id,
    log: ["STAGE " + stage.level + (stage.isBoss ? " / BOSS" : ""), "通常攻撃でSPを回復。エネルギー100で必殺技が使える。"],
  };
}
export function addLog(state, message) { state.log.push(message); state.log = state.log.slice(-60); }
export function livingEnemies(state) { return state.enemies.filter(e => e.hp > 0); }
export function selectedEnemy(state) { return livingEnemies(state).find(e => e.id === state.selectedTargetId) ?? livingEnemies(state)[0]; }
export function selectTarget(state, id) {
  if (state.status !== "playing" || state.currentActorId !== "player" || !livingEnemies(state).some(e => e.id === id)) return false;
  state.selectedTargetId = id; return true;
}
export function canUseSkill(state, id) {
  const skill = getSkill(id);
  if (!skill || state.status !== "playing" || state.currentActorId !== "player") return false;
  if (state.sp < skill.spCost || state.player.energy < (skill.energyCost || 0)) return false;
  return !(skill.type === "heal" && state.player.hp >= state.player.maxHp);
}
export function previewOrder(state, count = 6) {
  const units = [state.player, ...livingEnemies(state)].filter(u => u.hp > 0).map(u => ({ ...u }));
  if (!units.length) return [];
  const order = [];
  for (let index = 0; index < count; index++) {
    units.sort((a,b) => a.nextAction - b.nextAction || (a.id === "player" ? -1 : b.id === "player" ? 1 : a.id.localeCompare(b.id)));
    const unit = units[0];
    order.push({ id: unit.id, name: unit.name, isPlayer: unit.id === "player", value: Math.max(0, Math.round(unit.nextAction - state.now)) });
    unit.nextAction += tick(unit);
  }
  return order;
}
const rollDamage = (base, rng) => Math.max(1, Math.floor(base * (.95 + rng() * .1)));
function damageEnemy(state, enemy, skill, power, rng) {
  const amount = rollDamage(state.player.attack * power * (enemy.guarding ? .5 : 1), rng);
  enemy.guarding = false;
  const damage = Math.min(enemy.hp, amount);
  enemy.hp = Math.max(0, enemy.hp - amount);
  addLog(state, skill.subtitle + " → " + enemy.name + "に" + damage + "ダメージ");
  return { type: "damage", id: enemy.id, amount: damage, element: skill.element, dead: enemy.hp === 0 };
}
export function resolvePlayerAction(state, id, rng = Math.random) {
  if (!canUseSkill(state, id)) return null;
  const skill = getSkill(id), events = [];
  state.sp = Math.min(state.maxSp, state.sp - skill.spCost + skill.spGain);
  state.player.energy = Math.min(100, state.player.energy - (skill.energyCost || 0) + skill.energy);
  if (skill.type === "attack") {
    const target = selectedEnemy(state);
    const targetIndex = state.enemies.indexOf(target);
    for (const [index, enemy] of state.enemies.entries()) {
      if (enemy.hp <= 0 || !(skill.all || enemy === target || (skill.splash && Math.abs(index-targetIndex) === 1))) continue;
      const primary = skill.all || enemy === target;
      events.push(damageEnemy(state, enemy, skill, primary ? skill.power : skill.splash, rng));
    }
  } else if (skill.type === "heal") {
    const amount = Math.min(state.player.maxHp - state.player.hp, Math.floor(state.player.maxHp * skill.healRate));
    state.player.hp += amount; events.push({ type: "heal", id: "player", amount });
    addLog(state, "星の息吹 → HP +" + amount);
  } else {
    state.player.guarding = true; events.push({ type: "guard", id: "player" });
    addLog(state, "次の自分の番まで被ダメージ半減 / SP +1");
  }
  if (!livingEnemies(state).length) state.status = "victory";
  else state.selectedTargetId = selectedEnemy(state).id;
  return { skill, events, consumesTurn: !skill.freeAction };
}
export function resolveEnemyAction(state, rng = Math.random) {
  const enemy = livingEnemies(state).find(e => e.id === state.currentActorId);
  if (!enemy || state.status !== "playing") return null;
  const intent = getEnemyIntent(enemy.actionCount++, enemy.attack, enemy.monster, enemy);
  const events = [];
  if (intent.type === "guard") {
    enemy.guarding = true; events.push({ type: "guard", id: enemy.id });
    addLog(state, enemy.name + "の" + intent.name + "！ 次の被ダメージ半減");
  } else if (intent.type === "heal") {
    const amount = Math.min(enemy.maxHp - enemy.hp, Math.floor(enemy.maxHp * .12));
    enemy.hp += amount; events.push({ type: "heal", id: enemy.id, amount });
    addLog(state, enemy.name + "の" + intent.name + " → HP +" + amount);
  } else {
    for (let i = 0; i < intent.hits && state.player.hp > 0; i++) {
      const amount = rollDamage(enemy.attack * intent.multiplier * (state.player.guarding ? .5 : 1), rng);
      const damage = Math.min(state.player.hp, amount);
      state.player.hp -= damage; state.player.energy = Math.min(100, state.player.energy + 10);
      events.push({ type: "damage", id: "player", amount: damage, element: intent.effect, dead: state.player.hp === 0 });
      addLog(state, enemy.name + "の" + intent.name + " → " + damage + "ダメージ" + (state.player.guarding ? "（防御中）" : ""));
      if (intent.drain) {
        const amount = Math.min(enemy.maxHp - enemy.hp, Math.floor(damage * intent.drain));
        enemy.hp += amount; events.push({ type: "heal", id: enemy.id, amount });
      }
    }
  }
  if (state.player.hp <= 0) state.status = "defeat";
  return { ...intent, enemyId: enemy.id, events };
}
export function completeTurn(state) {
  if (state.status !== "playing") return;
  const all = [state.player, ...livingEnemies(state)];
  const previous = all.find(u => u.id === state.currentActorId);
  if (previous) previous.nextAction = state.now + tick(previous);
  all.sort((a,b) => a.nextAction - b.nextAction || (a.id === "player" ? -1 : b.id === "player" ? 1 : a.id.localeCompare(b.id)));
  const next = all[0];
  state.now = next.nextAction; state.currentActorId = next.id;
  state.phase = next.id === "player" ? "player" : "enemy";
  if (next.id === "player") { state.turn++; state.player.guarding = false; }
}
