export const CHAPTERS = Object.freeze([
  ["芽吹きの森", "🌱", "小さな芽が、光を探して伸び始める。森の守護者が最初の挑戦を待っている。", "#294e44"],
  ["月灯りの渓谷", "🌙", "静かな水面に、まだ見ぬ道が映る。仲間を呼ぶ魔物の群れを越えていこう。", "#39395d"],
  ["琥珀の砂海", "☀", "砂の下で眠る古い記憶。ひとつずつ踏み出した足あとが道になる。", "#655032"],
  ["白銀の砦", "❄", "凍りついた城門を開くのは、積み重ねた力。氷の守護者と向き合おう。", "#315468"],
  ["星屑の庭園", "✧", "散らばった星を集める庭。昨日の自分から受け取った力を試すとき。", "#4c3d64"],
  ["緋色の火山", "🔥", "地の底で炎が脈打つ。急がず、敵の動きを見極めて進もう。", "#65362e"],
  ["深緑の遺跡", "🍃", "古い石碑に刻まれた、遠征者たちの記憶。あなたの物語もここに続く。", "#2b5143"],
  ["雲上の回廊", "☁", "雲の切れ間から、歩いてきた大地が見える。休んだ日も、道の一部。", "#38536a"],
  ["黄昏の聖域", "🌓", "光と影が交わる場所。何度でも立ち上がる力を、あなたは持っている。", "#573c55"],
  ["星天の頂", "✦", "遠征の最後に待つものは、新しい始まり。日々の達成を力に、頂へ。", "#47446a"],
].map(([name, icon, story, color], index) => Object.freeze({id: index + 1, name, icon, story, color, first: index * 10 + 1, last: (index + 1) * 10})));
export function getChapter(stage) { return CHAPTERS[Math.min(9, Math.max(0, Math.floor((Number(stage) - 1) / 10)))] || CHAPTERS[0]; }
export function relicBonuses(clearedStage) {
  const relics = Math.min(10, Math.max(0, Math.floor(Number(clearedStage || 0) / 10)));
  return {relics, attack: relics * 2, hp: relics * 5};
}
