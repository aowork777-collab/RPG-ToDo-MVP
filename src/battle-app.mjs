import {
  renderBattlePage,
  retryBattle,
  returnToStageSelection,
  selectBattleLevel,
  startBattle,
  useBattleSkill,
} from "./features/battle/index.mjs";

import {
  getProgress,
} from "./model.mjs";

import {
  loadState,
  saveState,
} from "./storage.mjs";

let state;
let root;

function getPlayerLevel() {
  return getProgress(
    state.totalXp,
  ).level;
}

function persist() {
  const result =
    saveState(state);

  if (!result.ok) {
    console.error(
      "戦闘データを保存できませんでした",
    );
  }

  return result;
}

function render() {
  renderBattlePage(
    root,
    state,
    {
      playerLevel:
        getPlayerLevel(),

      actions: {
        selectLevel:
          handleSelectLevel,

        startBattle:
          handleStartBattle,

        useSkill:
          handleUseSkill,

        retry:
          handleRetry,

        returnToStages:
          handleReturnToStages,
      },
    },
  );
}

function handleSelectLevel(
  level,
) {
  selectBattleLevel(
    state,
    level,
    getPlayerLevel(),
  );

  persist();
  render();
}

function handleStartBattle() {
  startBattle(
    state,
    getPlayerLevel(),
  );

  persist();
  render();
}

function handleUseSkill(
  skillId,
) {
  useBattleSkill(
    state,
    skillId,
  );

  persist();
  render();
}

function handleRetry() {
  retryBattle(
    state,
    getPlayerLevel(),
  );

  persist();
  render();
}

function handleReturnToStages() {
  returnToStageSelection(
    state,
  );

  persist();
  render();
}

function init() {
  root =
    document.getElementById(
      "battleApp",
    );

  if (!root) {
    return;
  }

  state =
    loadState();

  persist();
  render();
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    init,
    {
      once: true,
    },
  );
} else {
  init();
}