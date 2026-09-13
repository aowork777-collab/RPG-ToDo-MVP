import { PLAYER_STATS } from "../config.mjs";

export function createPlayerState(value) {
  const n = Number(value);
  const level = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
  const maxHp = PLAYER_STATS.baseHp + level * PLAYER_STATS.hpPerLevel;
  return { id: "player", name: "YOU", level, hp: maxHp, maxHp,
    attack: PLAYER_STATS.baseAttack + level * PLAYER_STATS.attackPerLevel,
    speed: 110, nextAction: 0, guarding: false, energy: 0, maxEnergy: 100 };
}
export function damageRange(base) { return { min: Math.max(1, Math.floor(base * .95)), max: Math.max(1, Math.floor(base * 1.05)) }; }
export function getEnemyIntent(turn, attack, monster, enemy) {
  const move = monster.pattern[(Math.max(1, turn) - 1) % monster.pattern.length];
  const enraged = Boolean(enemy.isBoss && enemy.hp / enemy.maxHp <= .4);
  const multiplier = move.multiplier * (enraged ? 1.15 : 1);
  const range = move.type === "attack" ? damageRange(attack * multiplier) : { min: 0, max: 0 };
  return { ...move, multiplier, enraged, strong: multiplier * move.hits >= 1.5, min: range.min * move.hits, max: range.max * move.hits };
}
export function matchesWeakness(enemy, element) { return element === "astral" || enemy.weaknesses.includes(element); }
export function previewDamage(player, enemy, skill) {
  const modifier = (enemy.broken ? 1.25 : 1) * (enemy.guarding ? .5 : 1);
  return damageRange(player.attack * skill.power * modifier);
}
