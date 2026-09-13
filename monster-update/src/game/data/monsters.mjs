import { SPRITE_FRAMES } from "./sprite-atlas.mjs";
const hit = (name, multiplier = 1, effect = "slash", hits = 1, drain = 0) => ({ type: "attack", name, multiplier, effect, hits, drain });
const support = (type, name, effect) => ({ type, name, effect, multiplier: 0, hits: 0 });
const sheet = id => new URL(`../../../assets/game/enemies/${id}.png`, import.meta.url).href;

export const MONSTER_SPRITE = Object.freeze({
  columns: 4, rows: 3,
  animations: Object.freeze({
    idle: { row: 0, startFrame: 0, frames: 4, fps: 5, loop: true },
    run: { row: 0, startFrame: 0, frames: 4, fps: 9, loop: true },
    charge: { row: 1, startFrame: 0, frames: 2, fps: 5, loop: true },
    attack: { row: 1, startFrame: 0, frames: 4, fps: 9, loop: false },
    hurt: { row: 2, startFrame: 0, frames: 2, fps: 5, loop: false },
    dead: { row: 2, startFrame: 2, frames: 2, fps: 4, loop: false },
    guard: { row: 0, startFrame: 0, frames: 4, fps: 3, loop: true },
    victory: { row: 0, startFrame: 0, frames: 4, fps: 5, loop: true },
  }),
});

const definitions = [
  { id: "slime", name: "スライム", minLevel: 1, icon: "🟢", tag: "入門", region: "月明かりの森", color: "#77dfae", size: 205, hp: 1, attack: 1, gold: 1,
    description: "ぷるぷる跳ねる森の住人。3回目の体当たりに注意。", pattern: [hit("体当たり", 1, "impact"), hit("跳ねる", 1, "impact"), hit("スライムプレス", 1.65, "impact")] },
  { id: "goblin", name: "ゴブリン", minLevel: 3, icon: "👺", tag: "連撃", region: "盗賊の野営地", color: "#aed477", size: 225, hp: .95, attack: 1, gold: 1.05,
    description: "短剣を使うすばしこい敵。二連突きはガードで軽減。", pattern: [hit("短剣斬り"), hit("二連突き", .65, "slash", 2), hit("飛び込み斬り", 1.55)] },
  { id: "wolf", name: "ワイルドウルフ", minLevel: 5, icon: "🐺", tag: "連撃", region: "遠吠えの小道", color: "#adcff7", size: 255, hp: .95, attack: 1.05, gold: 1.1,
    description: "牙と爪の連続攻撃。予告の回数も見て守りを選ぼう。", pattern: [hit("噛みつき", 1, "impact"), hit("双牙", .7, "slash", 2), hit("ムーンファング", 1.65, "slash")] },
  { id: "skeleton", name: "スケルトン", minLevel: 7, icon: "💀", tag: "防御", region: "忘れられた遺跡", color: "#dfd6bf", size: 240, hp: 1.05, attack: 1, gold: 1.1,
    description: "盾を構えると次の一撃を半減。防御のターンに回復もできる。", pattern: [hit("錆びた剣"), support("guard", "骨の盾", "guard"), hit("骨砕き", 1.65)] },
  { id: "orc", name: "オーク", minLevel: 10, icon: "👹", tag: "強打", region: "巨人の砦", color: "#d7b27c", size: 260, hp: 1.2, attack: 1.1, gold: 1.2,
    description: "体力が高い強敵。大振りの棍棒はガードしてしのぐ。", pattern: [hit("棍棒", 1, "impact"), hit("なぎ払い", 1.15, "slash"), hit("大地砕き", 1.9, "impact")] },
  { id: "demon", name: "デーモン", minLevel: 15, icon: "😈", tag: "吸収", region: "深紅の境界", color: "#ce9cf5", size: 250, hp: 1.05, attack: 1.05, gold: 1.2,
    description: "闇の魔法でHPを吸収。吸収攻撃を防ぐと敵の回復も減る。", pattern: [hit("魔爪", 1, "shadow"), hit("ソウルドレイン", 1.1, "shadow", 1, .4), hit("ナイトメア", 1.7, "shadow")] },
  { id: "dragon", name: "ドラゴン", minLevel: 20, icon: "🐉", tag: "ボス", boss: true, region: "竜の聖域", color: "#ff9c77", size: 285, hp: 1.3, attack: 1.1, gold: 1.4,
    description: "炎を吐く竜。HP40%以下で怒り、攻撃力が15%上がる。", pattern: [hit("竜の爪"), hit("テイルスマッシュ", 1.2, "impact"), hit("フレイムブレス", .95, "fire", 2)] },
  { id: "mimic", name: "ミミック", minLevel: 30, icon: "🧰", tag: "NEW / 奇襲", region: "宝物庫の入口", color: "#f0cc78", size: 250, hp: 1, attack: 1.1, gold: 1.5,
    description: "宝箱に潜む魔物。ふたの二連噛みつきは見た目以上に危険。", pattern: [hit("かみつく", 1.05, "impact"), hit("ダブルバイト", .8, "impact", 2), support("guard", "ふたを閉じる", "guard")] },
  { id: "frost-golem", name: "フロストゴーレム", minLevel: 40, icon: "🧊", tag: "NEW / 防御", region: "凍てつく回廊", color: "#8de2ff", size: 285, hp: 1.35, attack: 1.05, gold: 1.4,
    description: "氷の巨体を持つ守護者。氷の装甲と重い一撃を使い分ける。", pattern: [support("guard", "氷の装甲", "ice"), hit("氷拳", 1.25, "ice"), hit("グレイシャークラッシュ", 1.85, "ice")] },
  { id: "phoenix", name: "フェニックス", minLevel: 55, icon: "🔥", tag: "NEW / ボス", boss: true, region: "再生の祭壇", color: "#ffc06e", size: 285, hp: 1.15, attack: 1.15, gold: 1.5,
    description: "炎の翼で舞い、3回目の行動でHPを12%回復。HP40%以下で怒る。", pattern: [hit("炎の羽", .65, "fire", 2), hit("バーニングダイブ", 1.65, "fire"), support("heal", "再生の炎", "heal")] },
];
export const MONSTERS = Object.freeze(definitions.map(monster => Object.freeze({ ...monster, imageUrl: sheet(monster.id), sprite: { ...MONSTER_SPRITE, frames: SPRITE_FRAMES[monster.id], baseSize: Math.max(...SPRITE_FRAMES[monster.id].slice(0, 4).flatMap(frame => frame.slice(2))) } })));
export function getMonster(id) { return MONSTERS.find(monster => monster.id === id) ?? null; }
export function normalizeMonsterId(id) { return getMonster(id)?.id ?? "auto"; }
export function defaultMonster(level) { return MONSTERS.reduce((selected, monster) => monster.minLevel <= level ? monster : selected, MONSTERS[0]); }
