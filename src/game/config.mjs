export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const MAX_BATTLE_LEVEL = 99;

export const PLAYER_HOME = Object.freeze({ x: 220, y: 350 });
export const ENEMY_HOME = Object.freeze({ x: 740, y: 350 });

export const PLAYER_STATS = Object.freeze({
  baseHp: 60,
  hpPerLevel: 15,
  baseMp: 20,
  mpPerLevel: 2,
  baseAttack: 8,
  attackPerLevel: 4,
});

export const GAME_STORAGE_KEY = "rpg-todo:game:v1";

export const PLAYER_SPRITE_URL = new URL(
  "../../assets/game/player-adventurer-sheet.png",
  import.meta.url,
).href;

export const PLAYER_SPRITE = Object.freeze({
  columns: 4,
  rows: 4,
  animations: Object.freeze({
    idle: Object.freeze({ row: 0, startFrame: 0, frames: 4, fps: 4, loop: true }),
    run: Object.freeze({ row: 1, startFrame: 0, frames: 4, fps: 9, loop: true }),
    attack: Object.freeze({ row: 2, startFrame: 0, frames: 4, fps: 12, loop: false }),
    hurt: Object.freeze({ row: 3, startFrame: 0, frames: 1, fps: 1, loop: false }),
    dead: Object.freeze({ row: 3, startFrame: 1, frames: 1, fps: 1, loop: false }),
    victory: Object.freeze({ row: 3, startFrame: 3, frames: 1, fps: 1, loop: false }),
  }),
});
