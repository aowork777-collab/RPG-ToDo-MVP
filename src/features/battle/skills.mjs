export const BATTLE_SKILLS =
  Object.freeze([
    Object.freeze({
      id: "attack",
      name: "通常攻撃",
      icon: "⚔",
      description:
        "MPを使わない基本攻撃",
      type: "attack",
      mpCost: 0,
      power: 1,
    }),

    Object.freeze({
      id: "power-slash",
      name: "強攻撃",
      icon: "💥",
      description:
        "MPを使って大きなダメージ",
      type: "attack",
      mpCost: 5,
      power: 1.7,
    }),

    Object.freeze({
      id: "guard",
      name: "ガード",
      icon: "🛡",
      description:
        "次の敵ダメージを半減",
      type: "guard",
      mpCost: 0,
      damageReduction: 0.5,
    }),

    Object.freeze({
      id: "heal",
      name: "ヒール",
      icon: "✨",
      description:
        "最大HPの30%を回復",
      type: "heal",
      mpCost: 8,
      healRate: 0.3,
    }),
  ]);

export function getBattleSkill(
  skillId,
) {
  return (
    BATTLE_SKILLS.find(
      (skill) =>
        skill.id === skillId,
    ) ?? null
  );
}