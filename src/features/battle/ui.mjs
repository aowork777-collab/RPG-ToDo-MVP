import {
  getBattlePlayerLevel,
} from "./actions.mjs";

import {
  selectEnemyForLevel,
} from "./enemies.mjs";

import {
  ensureBattleState,
} from "./state.mjs";

function createElement(
  tagName,
  className = "",
  text = "",
) {
  const element =
    document.createElement(
      tagName,
    );

  if (className) {
    element.className =
      className;
  }

  if (text) {
    element.textContent =
      text;
  }

  return element;
}

function createStat(
  label,
  value,
) {
  const stat =
    createElement(
      "div",
      "battle-stat",
    );

  const labelElement =
    createElement(
      "span",
      "",
      label,
    );

  const valueElement =
    createElement(
      "strong",
      "",
      String(value),
    );

  stat.append(
    labelElement,
    valueElement,
  );

  return stat;
}

function calculateHpRate(
  remainingHp,
  maxHp,
) {
  if (maxHp <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (remainingHp /
          maxHp) *
          100,
      ),
    ),
  );
}

function createHpBar({
  label,
  remainingHp,
  maxHp,
  enemy = false,
}) {
  const wrapper =
    createElement(
      "div",
      "battle-hp",
    );

  const copy =
    createElement(
      "div",
      "battle-hp-copy",
    );

  const name =
    createElement(
      "span",
      "",
      label,
    );

  const value =
    createElement(
      "strong",
      "",
      `${remainingHp} / ${maxHp}`,
    );

  copy.append(name, value);

  const track =
    createElement(
      "div",
      "battle-hp-track",
    );

  const bar =
    createElement(
      "span",
      enemy
        ? "battle-hp-bar enemy"
        : "battle-hp-bar player",
    );

  bar.style.width =
    `${calculateHpRate(
      remainingHp,
      maxHp,
    )}%`;

  track.append(bar);

  wrapper.append(
    copy,
    track,
  );

  return wrapper;
}

function createResultPanel(result) {
  const panel =
    createElement(
      "section",
      result.victory
        ? "battle-result victory"
        : "battle-result defeat",
    );

  const title =
    createElement(
      "strong",
      "battle-result-title",
      result.victory
        ? "VICTORY!"
        : "DEFEAT",
    );

  const reward =
    createElement(
      "span",
      "battle-result-reward",
      result.victory
        ? `+${result.goldEarned} GOLD`
        : "GOLDは失いません",
    );

  panel.append(
    title,
    reward,
  );

  const hpArea =
    createElement(
      "div",
      "battle-result-hp",
    );

  hpArea.append(
    createHpBar({
      label: "YOU",
      remainingHp:
        result.playerHpRemaining,
      maxHp:
        result.playerMaxHp,
    }),

    createHpBar({
      label:
        result.enemyName,
      remainingHp:
        result.enemyHpRemaining,
      maxHp:
        result.enemyMaxHp,
      enemy: true,
    }),
  );

  panel.append(hpArea);

  const logTitle =
    createElement(
      "p",
      "battle-log-title",
      `BATTLE LOG / ${result.turns} TURN`,
    );

  const logList =
    createElement(
      "ol",
      "battle-log",
    );

  result.log.forEach(
    (line) => {
      const item =
        createElement(
          "li",
          "",
          line,
        );

      logList.append(item);
    },
  );

  panel.append(
    logTitle,
    logList,
  );

  return panel;
}

export function renderBattle(
  elements,
  state,
  actions,
) {
  const container =
    elements.battleContainer;

  if (!container) {
    return;
  }

  const battle =
    ensureBattleState(state);

  const playerLevel =
    getBattlePlayerLevel(
      state.totalXp,
    );

  const enemy =
    selectEnemyForLevel(
      playerLevel,
    );

  container.replaceChildren();

  const card =
    createElement(
      "article",
      "battle-card panel",
    );

  const stats =
    createElement(
      "div",
      "battle-stats",
    );

  stats.append(
    createStat(
      "PLAYER LEVEL",
      playerLevel,
    ),

    createStat(
      "WINS",
      battle.wins,
    ),

    createStat(
      "LOSSES",
      battle.losses,
    ),

    createStat(
      "GOLD",
      battle.gold,
    ),
  );

  const enemyArea =
    createElement(
      "div",
      "battle-enemy",
    );

  const enemyIcon =
    createElement(
      "div",
      "battle-enemy-icon",
      enemy.icon,
    );

  enemyIcon.setAttribute(
    "aria-hidden",
    "true",
  );

  const enemyInfo =
    createElement(
      "div",
      "battle-enemy-info",
    );

  const enemyLabel =
    createElement(
      "span",
      "battle-enemy-label",
      "CURRENT ENEMY",
    );

  const enemyName =
    createElement(
      "h3",
      "",
      enemy.name,
    );

  const enemyLevel =
    createElement(
      "p",
      "",
      `ENEMY LEVEL ${enemy.level}`,
    );

  const enemyReward =
    createElement(
      "strong",
      "battle-enemy-reward",
      `REWARD +${enemy.goldReward} GOLD`,
    );

  enemyInfo.append(
    enemyLabel,
    enemyName,
    enemyLevel,
    enemyReward,
  );

  enemyArea.append(
    enemyIcon,
    enemyInfo,
  );

  const battleButton =
    createElement(
      "button",
      "primary-button battle-button",
      "⚔ 戦闘する",
    );

  battleButton.type =
    "button";

  const canBattle =
    typeof actions?.startBattle ===
    "function";

  battleButton.disabled =
    !canBattle;

  if (canBattle) {
    battleButton.addEventListener(
      "click",
      () => {
        actions.startBattle(
          enemy.id,
        );
      },
    );
  }

  card.append(
    stats,
    enemyArea,
    battleButton,
  );

  if (battle.lastResult) {
    card.append(
      createResultPanel(
        battle.lastResult,
      ),
    );
  }

  container.append(card);
}