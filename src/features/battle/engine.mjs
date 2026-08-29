import {
  getBattleSkill,
} from "./skills.mjs";

import {
  clampBattleLevel,
  getBattleStage,
} from "./stages.mjs";

import {
  ensureBattleState,
} from "./state.mjs";

function randomDamage(baseDamage) {
  const rate =
    0.9 +
    Math.random() * 0.2;

  return Math.max(
    1,
    Math.floor(
      baseDamage * rate,
    ),
  );
}

function appendLog(
  currentBattle,
  message,
) {
  currentBattle.log.push(
    message,
  );

  currentBattle.log =
    currentBattle.log.slice(
      -80,
    );
}

function createPlayer(
  playerLevel,
) {
  const level =
    Math.max(
      1,
      Math.floor(
        Number(playerLevel) || 1,
      ),
    );

  const maxHp =
    60 +
    level * 15;

  const maxMp =
    20 +
    level * 2;

  return {
    id: "player",
    name: "YOU",
    icon: "🧑‍🚀",
    level,

    hp: maxHp,
    maxHp,

    mp: maxMp,
    maxMp,

    attack:
      8 +
      level * 4,

    guarding: false,
  };
}

function createEnemy(stage) {
  return {
    id:
      stage.enemyId,

    name:
      stage.enemyName,

    icon:
      stage.enemyIcon,

    level:
      stage.level,

    hp:
      stage.enemyMaxHp,

    maxHp:
      stage.enemyMaxHp,

    mp: 0,
    maxMp: 0,

    attack:
      stage.enemyAttack,

    guarding: false,
  };
}

function finishVictory(battle) {
  const current =
    battle.currentBattle;

  current.status =
    "victory";

  current.phase =
    "finished";

  current.goldEarned =
    current.goldReward;

  current.finishedAt =
    new Date().toISOString();

  battle.gold +=
    current.goldReward;

  battle.wins += 1;

  battle.highestClearedLevel =
    Math.max(
      battle.highestClearedLevel,
      current.battleLevel,
    );

  appendLog(
    current,
    `VICTORY! +${current.goldReward} GOLD`,
  );
}

function finishDefeat(battle) {
  const current =
    battle.currentBattle;

  current.status =
    "defeat";

  current.phase =
    "finished";

  current.goldEarned = 0;

  current.finishedAt =
    new Date().toISOString();

  battle.losses += 1;

  appendLog(
    current,
    "DEFEAT... GOLDは失いません",
  );
}

function runEnemyTurn(battle) {
  const current =
    battle.currentBattle;

  const {
    player,
    enemy,
  } = current;

  current.phase =
    "enemy";

  const powerfulAttack =
    Math.random() < 0.15;

  let damage =
    randomDamage(
      enemy.attack *
        (
          powerfulAttack
            ? 1.4
            : 1
        ),
    );

  if (player.guarding) {
    damage =
      Math.max(
        1,
        Math.floor(
          damage * 0.5,
        ),
      );

    player.guarding =
      false;

    appendLog(
      current,
      `GUARD! ダメージを${damage}に軽減`,
    );
  }

  player.hp =
    Math.max(
      0,
      player.hp - damage,
    );

  appendLog(
    current,
    powerfulAttack
      ? `${enemy.name}の強攻撃! -${damage} HP`
      : `${enemy.name}の攻撃! -${damage} HP`,
  );

  if (player.hp <= 0) {
    finishDefeat(
      battle,
    );

    return;
  }

  /*
   * 敵の攻撃後にMPを2回復
   */
  player.mp =
    Math.min(
      player.maxMp,
      player.mp + 2,
    );

  current.turn += 1;
  current.phase = "player";
}

/*
 * BATTLE LEVELを変更します。
 *
 * PLAYER LEVELによる制限は行いません。
 * stages.mjsのMAX_BATTLE_LEVELだけが上限です。
 */
export function selectBattleLevel(
  state,
  battleLevel,
) {
  const battle =
    ensureBattleState(
      state,
    );

  if (
    battle.currentBattle
      ?.status === "playing"
  ) {
    return false;
  }

  battle.selectedBattleLevel =
    clampBattleLevel(
      battleLevel,
    );

  return true;
}

/*
 * 戦闘を開始します。
 *
 * playerLevel:
 * タスクで上げたプレイヤーの強さ
 *
 * requestedBattleLevel:
 * 自分で選択した敵のレベル
 */
export function startBattle(
  state,
  playerLevel,
  requestedBattleLevel,
) {
  const battle =
    ensureBattleState(
      state,
    );

  const selectedLevel =
    clampBattleLevel(
      requestedBattleLevel ??
        battle.selectedBattleLevel,
    );

  const stage =
    getBattleStage(
      selectedLevel,
    );

  battle.selectedBattleLevel =
    selectedLevel;

  battle.currentBattle = {
    status: "playing",
    phase: "player",
    turn: 1,

    battleLevel:
      selectedLevel,

    goldReward:
      stage.goldReward,

    goldEarned: 0,

    player:
      createPlayer(
        playerLevel,
      ),

    enemy:
      createEnemy(
        stage,
      ),

    log: [
      `BATTLE LEVEL ${selectedLevel} START!`,
      `${stage.enemyName}が現れた!`,
    ],

    startedAt:
      new Date().toISOString(),

    finishedAt: null,
  };

  return battle.currentBattle;
}

export function useBattleSkill(
  state,
  skillId,
) {
  const battle =
    ensureBattleState(
      state,
    );

  const current =
    battle.currentBattle;

  const skill =
    getBattleSkill(
      skillId,
    );

  if (
    !current ||
    current.status !== "playing"
  ) {
    return {
      ok: false,
      message:
        "戦闘が開始されていません",
    };
  }

  if (
    current.phase !== "player"
  ) {
    return {
      ok: false,
      message:
        "敵のターンです",
    };
  }

  if (!skill) {
    return {
      ok: false,
      message:
        "技が見つかりません",
    };
  }

  if (
    current.player.mp <
    skill.mpCost
  ) {
    appendLog(
      current,
      `${skill.name}: MPが足りません`,
    );

    return {
      ok: false,
      message:
        "MPが足りません",
    };
  }

  current.player.mp -=
    skill.mpCost;

  /*
   * 攻撃技
   */
  if (
    skill.type === "attack"
  ) {
    const damage =
      randomDamage(
        current.player.attack *
          skill.power,
      );

    current.enemy.hp =
      Math.max(
        0,
        current.enemy.hp -
          damage,
      );

    appendLog(
      current,
      `${skill.icon} ${skill.name}! -${damage} HP`,
    );
  }

  /*
   * ガード
   */
  if (
    skill.type === "guard"
  ) {
    current.player.guarding =
      true;

    appendLog(
      current,
      `${skill.icon} ガードの構え!`,
    );
  }

  /*
   * 回復
   */
  if (
    skill.type === "heal"
  ) {
    const healAmount =
      Math.max(
        1,
        Math.floor(
          current.player.maxHp *
            skill.healRate,
        ),
      );

    const previousHp =
      current.player.hp;

    current.player.hp =
      Math.min(
        current.player.maxHp,
        current.player.hp +
          healAmount,
      );

    const actualHeal =
      current.player.hp -
      previousHp;

    appendLog(
      current,
      `${skill.icon} ${actualHeal} HP回復!`,
    );
  }

  /*
   * 敵を倒した場合
   */
  if (
    current.enemy.hp <= 0
  ) {
    finishVictory(
      battle,
    );

    return {
      ok: true,
      finished: true,
      victory: true,
      currentBattle:
        current,
    };
  }

  /*
   * 敵のターン
   */
  runEnemyTurn(
    battle,
  );

  return {
    ok: true,

    finished:
      current.status !==
      "playing",

    victory:
      current.status ===
      "victory",

    currentBattle:
      current,
  };
}

export function retryBattle(
  state,
  playerLevel,
) {
  const battle =
    ensureBattleState(
      state,
    );

  return startBattle(
    state,
    playerLevel,
    battle.selectedBattleLevel,
  );
}

export function returnToStageSelection(
  state,
) {
  const battle =
    ensureBattleState(
      state,
    );

  if (
    battle.currentBattle
      ?.status === "playing"
  ) {
    return false;
  }

  battle.currentBattle =
    null;

  return true;
}