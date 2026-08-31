export const GAME_SKILLS = Object.freeze([
  Object.freeze({
    id: "attack",
    name: "通常攻撃",
    icon: "⚔",
    type: "attack",
    mpCost: 0,
    power: 1,
    description: "安定した近接攻撃",
  }),
  Object.freeze({
    id: "power-slash",
    name: "パワースラッシュ",
    icon: "💥",
    type: "attack",
    mpCost: 5,
    power: 1.7,
    description: "MPを使う強力な斬撃",
  }),
  Object.freeze({
    id: "guard",
    name: "ガード",
    icon: "🛡",
    type: "guard",
    mpCost: 0,
    power: 0,
    description: "次の被ダメージを半減",
  }),
  Object.freeze({
    id: "heal",
    name: "ヒール",
    icon: "✨",
    type: "heal",
    mpCost: 8,
    healRate: 0.3,
    description: "最大HPの30%を回復",
  }),
]);

export function getSkill(skillId) {
  return GAME_SKILLS.find((skill) => skill.id === skillId) ?? null;
}
