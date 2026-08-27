import {
  selectEnemyForLevel,
} from "./enemies.mjs";

import {
  createBattleInitialState,
  ensureBattleState,
} from "./state.mjs";

const XP_PER_LEVEL = 100;
const MAX_TURNS = 30;

export function getBattlePlayerLevel(
  totalXp,
) {
  const xp = Number(totalXp);

  if (!Number.isFinite(xp)) {
    return 1;
  }

  return (
    Math.floor(
      Math.max(0, xp) /
        XP_PER_LEVEL,
    ) + 1
  );
}

function createAttack(baseAttack) {
  const randomRate =
    0.85 + Math.random() * 0.3;

  const critical =
    Math.random() < 0.1;

  const criticalRate =
    critical ? 1.5 : 1;

  const damage = Math.max(
    1,
    Math.floor(
      baseAttack *
        randomRate *
        criticalRate,
    ),
  );

  return {
    damage,
    critical,
  };
}

function createPlayerStats(level) {
  return {
    maxHp:
      60 + level * 12,

    attack:
      8 + level * 4,
  };
}

function createEnemyStats(enemy) {
  return {
    maxHp:
      40 +
      enemy.level * 10 +
      enemy.hpBonus,

    attack:
      4 +
      enemy.level * 3 +
      enemy.attackBonus,
  };
}

function simulateBattle({
  playerLevel,
  enemy,
}) {
  const player =
    createPlayerStats(
      playerLevel,
    );

  const enemyStats =
    createEnemyStats(enemy);

  let playerHp =
    player.maxHp;

  let enemyHp =
    enemyStats.maxHp;

  let turns = 0;
  const log = [];

  while (
    playerHp > 0 &&
    enemyHp > 0 &&
    turns < MAX_TURNS
  ) {
    turns += 1;

    const playerAttack =
      createAttack(
        player.attack,
      );

    enemyHp = Math.max(
      0,
      enemyHp -
        playerAttack.damage,
    );

    log.push(
      playerAttack.critical
        ? `CRITICAL! YOU ATTACK! -${playerAttack.damage} HP`
        : `YOU ATTACK! -${playerAttack.damage} HP`,
    );

    if (enemyHp <= 0) {
      break;
    }

    const enemyAttack =
      createAttack(
        enemyStats.attack,
      );

    playerHp = Math.max(
      0,
      playerHp -
        enemyAttack.damage,
    );

    log.push(
      enemyAttack.critical
        ? `ENEMY CRITICAL! -${enemyAttack.damage} HP`
        : `${enemy.name} ATTACK! -${enemyAttack.damage} HP`,
    );
  }

  /*
   * 念のため最大ターンに到達した場合は、
   * 残りHPの割合で勝敗を決定
   */
  let victory =
    enemyHp <= 0 &&
    playerHp > 0;

  if (
    turns >= MAX_TURNS &&
    playerHp > 0 &&
    enemyHp > 0
  ) {
    const playerHpRate =
      playerHp / player.maxHp;

    const enemyHpRate =
      enemyHp /
      enemyStats.maxHp;

    victory =
      playerHpRate >=
      enemyHpRate;

    if (victory) {
      enemyHp = 0;
    } else {
      playerHp = 0;
    }
  }

  return {
    victory,

    playerMaxHp:
      player.maxHp,

    playerHpRemaining:
      playerHp,

    enemyMaxHp:
      enemyStats.maxHp,

    enemyHpRemaining:
      enemyHp,

    turns,
    log,
  };
}

export function startBattle(
  state,
  options = {},
) {
  const battle =
    ensureBattleState(state);

  const calculatedLevel =
    getBattlePlayerLevel(
      state.totalXp,
    );

  const requestedLevel =
    Number(options.playerLevel);

  const playerLevel =
    Number.isFinite(requestedLevel)
      ? Math.max(
          1,
          Math.floor(
            requestedLevel,
          ),
        )
      : calculatedLevel;

  const enemy =
    selectEnemyForLevel(
      playerLevel,
      options.enemyId,
    );

  const simulation =
    simulateBattle({
      playerLevel,
      enemy,
    });

  const goldEarned =
    simulation.victory
      ? enemy.goldReward
      : 0;

  const result = {
    victory:
      simulation.victory,

    enemyId:
      enemy.id,

    enemyName:
      enemy.name,

    enemyIcon:
      enemy.icon,

    enemyLevel:
      enemy.level,

    playerLevel,

    playerMaxHp:
      simulation.playerMaxHp,

    playerHpRemaining:
      simulation.playerHpRemaining,

    enemyMaxHp:
      simulation.enemyMaxHp,

    enemyHpRemaining:
      simulation.enemyHpRemaining,

    turns:
      simulation.turns,

    goldEarned,

    log:
      simulation.log,

    foughtAt:
      new Date().toISOString(),
  };

  if (result.victory) {
    battle.wins += 1;
    battle.gold +=
      goldEarned;
  } else {
    battle.losses += 1;
  }

  battle.lastResult =
    result;

  return result;
}

export function resetBattleProgress(
  state,
) {
  state.battle =
    createBattleInitialState();

  return state.battle;
}