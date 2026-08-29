import {
  BATTLE_SKILLS,
} from "./skills.mjs";

import {
  getAvailableBattleLevels,
  getBattleStage,
} from "./stages.mjs";

import {
  ensureBattleState,
} from "./state.mjs";

function element(
  tagName,
  className = "",
  text = "",
) {
  const node =
    document.createElement(
      tagName,
    );

  if (className) {
    node.className =
      className;
  }

  if (text !== "") {
    node.textContent =
      text;
  }

  return node;
}

function stat(
  label,
  value,
) {
  const node =
    element(
      "div",
      "battle-page-stat",
    );

  node.append(
    element(
      "span",
      "",
      label,
    ),

    element(
      "strong",
      "",
      String(value),
    ),
  );

  return node;
}

function meter(
  label,
  current,
  max,
  type,
) {
  const wrapper =
    element(
      "div",
      "combat-meter",
    );

  const copy =
    element(
      "div",
      "combat-meter-copy",
    );

  copy.append(
    element(
      "span",
      "",
      label,
    ),

    element(
      "strong",
      "",
      `${current} / ${max}`,
    ),
  );

  const track =
    element(
      "div",
      "combat-meter-track",
    );

  const bar =
    element(
      "span",
      `combat-meter-bar ${type}`,
    );

  const percent =
    max > 0
      ? Math.max(
          0,
          Math.min(
            100,
            (
              current /
              max
            ) * 100,
          ),
        )
      : 0;

  bar.style.width =
    `${percent}%`;

  track.append(bar);

  wrapper.append(
    copy,
    track,
  );

  return wrapper;
}

function renderStageSelection(
  root,
  battle,
  playerLevel,
  actions,
) {
  const stage =
    getBattleStage(
      battle.selectedBattleLevel,
    );

  const panel =
    element(
      "section",
      "battle-select-panel battle-panel",
    );

  panel.append(
    element(
      "p",
      "battle-kicker",
      "SELECT BATTLE LEVEL",
    ),
  );

  panel.append(
    element(
      "h1",
      "",
      "戦うレベルを選択",
    ),
  );

  const select =
    element(
      "select",
      "battle-level-select",
    );

  select.setAttribute(
    "aria-label",
    "バトルレベルを選択",
  );

  getAvailableBattleLevels(
    playerLevel,
  ).forEach(
    (level) => {
      const option =
        element(
          "option",
          "",
          `BATTLE LEVEL ${level}`,
        );

      option.value =
        String(level);

      option.selected =
        level ===
        battle.selectedBattleLevel;

      select.append(
        option,
      );
    },
  );

  select.addEventListener(
    "change",
    () => {
      actions.selectLevel(
        Number(
          select.value,
        ),
      );
    },
  );

  const preview =
    element(
      "div",
      "stage-preview",
    );

  preview.append(
    element(
      "div",
      "stage-enemy-icon",
      stage.enemyIcon,
    ),

    element(
      "h2",
      "",
      stage.enemyName,
    ),

    element(
      "p",
      "",
      `ENEMY LEVEL ${stage.level}`,
    ),

    element(
      "strong",
      "stage-reward",
      `勝利報酬 +${stage.goldReward} GOLD`,
    ),
  );

  const startButton =
    element(
      "button",
      "primary-button battle-start-button",
      "⚔ 戦闘開始",
    );

  startButton.type =
    "button";

  startButton.addEventListener(
    "click",
    actions.startBattle,
  );

  panel.append(
    select,
    preview,
    startButton,
  );

  root.append(
    panel,
  );
}

function renderCombat(
  root,
  current,
  actions,
) {
  const panel =
    element(
      "section",
      "combat-panel battle-panel",
    );

  const turnText =
    current.status ===
    "playing"
      ? `TURN ${current.turn} / YOUR TURN`
      : current.status.toUpperCase();

  const turn =
    element(
      "div",
      "combat-turn",
      turnText,
    );

  const fighters =
    element(
      "div",
      "combat-fighters",
    );

  /*
   * プレイヤー
   */
  const playerCard =
    element(
      "article",
      "fighter-card player-fighter",
    );

  playerCard.append(
    element(
      "p",
      "fighter-label",
      `PLAYER LEVEL ${current.player.level}`,
    ),

    element(
      "h2",
      "",
      "YOU",
    ),

    meter(
      "HP",
      current.player.hp,
      current.player.maxHp,
      "hp-player",
    ),

    meter(
      "MP",
      current.player.mp,
      current.player.maxMp,
      "mp-player",
    ),
  );

  /*
   * 敵
   */
  const enemyCard =
    element(
      "article",
      "fighter-card enemy-fighter",
    );

  enemyCard.append(
    element(
      "div",
      "combat-enemy-icon",
      current.enemy.icon,
    ),

    element(
      "p",
      "fighter-label",
      `ENEMY LEVEL ${current.enemy.level}`,
    ),

    element(
      "h2",
      "",
      current.enemy.name,
    ),

    meter(
      "HP",
      current.enemy.hp,
      current.enemy.maxHp,
      "hp-enemy",
    ),
  );

  fighters.append(
    playerCard,

    element(
      "div",
      "combat-versus",
      "VS",
    ),

    enemyCard,
  );

  panel.append(
    turn,
    fighters,
  );

  /*
   * 戦闘中の技ボタン
   */
  if (
    current.status ===
    "playing"
  ) {
    const commandArea =
      element(
        "section",
        "combat-commands",
      );

    commandArea.append(
      element(
        "p",
        "battle-kicker",
        "SELECT COMMAND",
      ),
    );

    const buttons =
      element(
        "div",
        "skill-grid",
      );

    BATTLE_SKILLS.forEach(
      (skill) => {
        const button =
          element(
            "button",
            "skill-button",
          );

        button.type =
          "button";

        button.disabled =
          current.phase !==
            "player" ||
          current.player.mp <
            skill.mpCost;

        button.append(
          element(
            "span",
            "skill-icon",
            skill.icon,
          ),

          element(
            "strong",
            "",
            skill.name,
          ),

          element(
            "small",
            "",
            skill.mpCost > 0
              ? `MP ${skill.mpCost}`
              : "MP 0",
          ),

          element(
            "small",
            "skill-description",
            skill.description,
          ),
        );

        button.addEventListener(
          "click",
          () => {
            actions.useSkill(
              skill.id,
            );
          },
        );

        buttons.append(
          button,
        );
      },
    );

    commandArea.append(
      buttons,
    );

    panel.append(
      commandArea,
    );
  } else {
    /*
     * 戦闘終了
     */
    const resultText =
      current.status ===
      "victory"
        ? `VICTORY! +${current.goldEarned} GOLD`
        : "DEFEAT / GOLDは失いません";

    const result =
      element(
        "section",
        `combat-result ${current.status}`,
        resultText,
      );

    const controls =
      element(
        "div",
        "battle-result-actions",
      );

    const retry =
      element(
        "button",
        "primary-button",
        "もう一度戦う",
      );

    retry.type =
      "button";

    retry.addEventListener(
      "click",
      actions.retry,
    );

    const stages =
      element(
        "button",
        "secondary-button",
        "レベル選択へ戻る",
      );

    stages.type =
      "button";

    stages.addEventListener(
      "click",
      actions.returnToStages,
    );

    controls.append(
      retry,
      stages,
    );

    panel.append(
      result,
      controls,
    );
  }

  /*
   * 戦闘ログ
   */
  const logPanel =
    element(
      "section",
      "combat-log-panel",
    );

  logPanel.append(
    element(
      "p",
      "battle-kicker",
      "BATTLE LOG",
    ),
  );

  const log =
    element(
      "ol",
      "combat-log",
    );

  current.log.forEach(
    (line) => {
      log.append(
        element(
          "li",
          "",
          line,
        ),
      );
    },
  );

  logPanel.append(
    log,
  );

  panel.append(
    logPanel,
  );

  root.append(
    panel,
  );

  log.scrollTop =
    log.scrollHeight;
}

export function renderBattlePage(
  root,
  state,
  options,
) {
  if (!root) {
    return;
  }

  const battle =
    ensureBattleState(
      state,
    );

  const playerLevel =
    Math.max(
      1,
      Math.floor(
        Number(
          options.playerLevel,
        ) || 1,
      ),
    );

  battle.selectedBattleLevel =
    Math.min(
      battle.selectedBattleLevel,
      playerLevel,
    );

  root.replaceChildren();

  /*
   * 戦績
   */
  const status =
    element(
      "section",
      "battle-page-status",
    );

  status.append(
    stat(
      "PLAYER LEVEL",
      playerLevel,
    ),

    stat(
      "GOLD",
      battle.gold,
    ),

    stat(
      "WINS",
      battle.wins,
    ),

    stat(
      "LOSSES",
      battle.losses,
    ),

    stat(
      "MAX CLEAR",
      battle.highestClearedLevel,
    ),
  );

  root.append(
    status,
  );

  if (
    battle.currentBattle
  ) {
    renderCombat(
      root,
      battle.currentBattle,
      options.actions,
    );
  } else {
    renderStageSelection(
      root,
      battle,
      playerLevel,
      options.actions,
    );
  }
}