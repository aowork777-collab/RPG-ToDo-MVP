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
