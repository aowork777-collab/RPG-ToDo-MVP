import { PLAYER_STATS } from "../config.mjs";

export function createPlayerState(value) {
  const numeric = Number(value);
  const level = Number.isFinite(numeric) ? Math.max(1, Math.floor(numeric)) : 1;
  const maxHp = PLAYER_STATS.baseHp + level * PLAYER_STATS.hpPerLevel;
  const maxMp = PLAYER_STATS.baseMp + level * PLAYER_STATS.mpPerLevel;
  return { name: "YOU", level, hp: maxHp, maxHp, mp: maxMp, maxMp,
    attack: PLAYER_STATS.baseAttack + level * PLAYER_STATS.attackPerLevel,
    guarding: false };
}

export function damageRange(base) {
  return { min: Math.max(1, Math.floor(base * 0.9)), max: Math.max(1, Math.floor(base * 1.1)) };
}

export function getEnemyIntent(turn, attack, monster = null, enemy = null) {
  if (monster) {
    const move = monster.pattern[(Math.max(1, turn) - 1) % monster.pattern.length];
    const enraged = Boolean(monster.boss && enemy && enemy.hp / enemy.maxHp <= 0.4);
    const multiplier = move.multiplier * (enraged ? 1.15 : 1);
    const range = move.type === "attack" ? damageRange(attack * multiplier) : { min: 0, max: 0 };
    return { ...move, multiplier, enraged, strong: multiplier * move.hits >= 1.5,
      min: range.min * move.hits, max: range.max * move.hits,
      healAmount: move.type === "heal" && enemy ? Math.min(enemy.maxHp - enemy.hp, Math.floor(enemy.maxHp * .12)) : 0 };
  }
  const strong = turn % 3 === 0;
  const multiplier = strong ? 1.65 : 1;
  return { type: "attack", hits: 1, drain: 0, effect: "slash", strong, multiplier, name: strong ? "強攻撃" : "通常攻撃",
    ...damageRange(attack * multiplier) };
}
