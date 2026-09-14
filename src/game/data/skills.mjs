export const ELEMENTS = Object.freeze({
  physical: { name: "物理", mark: "斬", color: "#efc99b" },
  lightning: { name: "雷", mark: "雷", color: "#c6a4ff" },
  astral: { name: "星", mark: "星", color: "#80e7ff" },
});
export const GAME_SKILLS = Object.freeze([
  { id: "attack", name: "通常攻撃", subtitle: "流星斬り", type: "attack", element: "physical", power: 1, spCost: 0, spGain: 1, energy: 25, description: "単体攻撃 · SPを1回復" },
  { id: "power-slash", name: "戦闘スキル", subtitle: "雷光の連刃", type: "attack", element: "lightning", power: 1.85, splash: .65, spCost: 1, spGain: 0, energy: 35, description: "対象と隣の敵を攻撃" },
  { id: "guard", name: "防御", subtitle: "守りの構え", type: "guard", spCost: 0, spGain: 1, energy: 15, description: "次の自分の番まで被ダメージ半減" },
  { id: "heal", name: "回復スキル", subtitle: "星の息吹", type: "heal", healRate: .35, spCost: 1, spGain: 0, energy: 20, description: "最大HPの35%を回復" },
  { id: "ultimate", name: "必殺技", subtitle: "星天・一閃", type: "attack", element: "astral", power: 2.8, spCost: 0, spGain: 0, energy: 0, energyCost: 100, all: true, freeAction: true, description: "敵全体に大ダメージ · 行動を消費しない" },
]);
export function getSkill(id) { return GAME_SKILLS.find(skill => skill.id === id) ?? null; }
