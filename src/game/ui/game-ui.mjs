import { GAME_HEIGHT, GAME_WIDTH } from "../config.mjs";
import { GAME_SKILLS } from "../data/skills.mjs";

function setText(element, value) {
  if (element) element.textContent = String(value);
}

function setMeter(element, current, max) {
  if (!element) return;
  const percent = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  element.style.width = `${percent}%`;
}

export class GameUI {
  constructor(root, actions) {
    this.root = root;
    this.actions = actions;
    this.skillButtons = new Map();
    this.build();
    this.cache();
    this.bind();
  }

  build() {
    this.root.innerHTML = `
      <section class="game-status" aria-label="プレイヤーと戦績">
        <div><span>PLAYER LEVEL</span><strong id="gamePlayerLevel">1</strong></div>
        <div><span>GOLD</span><strong id="gameGold">0</strong></div>
        <div><span>WINS</span><strong id="gameWins">0</strong></div>
        <div><span>LOSSES</span><strong id="gameLosses">0</strong></div>
        <div><span>MAX CLEAR</span><strong id="gameMaxClear">0</strong></div>
      </section>

      <section class="game-screen-panel">
        <div class="game-canvas-wrap">
          <canvas
            id="gameCanvas"
            class="game-canvas"
            width="${GAME_WIDTH}"
            height="${GAME_HEIGHT}"
            aria-label="2Dバトル画面"
          ></canvas>

          <div class="game-hud" id="gameHud" hidden>
            <article class="hud-card player-hud">
              <div><span>YOU</span><strong id="hudPlayerLevel">LV.1</strong></div>
              <div class="hud-value"><span>HP</span><strong id="hudPlayerHp">0 / 0</strong></div>
              <div class="hud-track"><span id="hudPlayerHpBar" class="hud-bar player-hp"></span></div>
              <div class="hud-value"><span>MP</span><strong id="hudPlayerMp">0 / 0</strong></div>
              <div class="hud-track"><span id="hudPlayerMpBar" class="hud-bar player-mp"></span></div>
            </article>

            <article class="hud-card enemy-hud">
              <div><span id="hudEnemyName">ENEMY</span><strong id="hudEnemyLevel">LV.1</strong></div>
              <div class="hud-value"><span>HP</span><strong id="hudEnemyHp">0 / 0</strong></div>
              <div class="hud-track"><span id="hudEnemyHpBar" class="hud-bar enemy-hp"></span></div>
            </article>
          </div>
        </div>

        <section class="stage-controls" id="stageControls">
          <div>
            <p class="game-kicker">SELECT BATTLE LEVEL</p>
            <h1>戦うレベルを選択</h1>
          </div>
          <select id="stageSelect" class="game-stage-select" aria-label="バトルレベル"></select>
          <div class="stage-copy">
            <strong id="stageEnemyName">スライム</strong>
            <span id="stageEnemyLevel">ENEMY LEVEL 1</span>
            <b id="stageReward">+9 GOLD</b>
          </div>
          <button id="startBattleButton" class="game-primary-button" type="button">⚔ 戦闘開始</button>
        </section>

        <section class="battle-controls" id="battleControls" hidden>
          <div class="battle-turn-row">
            <p id="battleTurn" class="game-kicker">TURN 1 / YOUR TURN</p>
            <button id="leaveBattleButton" class="game-text-button" type="button" hidden>レベル選択へ戻る</button>
          </div>
          <div id="gameSkillGrid" class="game-skill-grid"></div>
          <section id="gameResult" class="game-result" hidden>
            <strong id="gameResultText"></strong>
            <div>
              <button id="retryBattleButton" class="game-primary-button" type="button">もう一度戦う</button>
              <button id="returnStageButton" class="game-secondary-button" type="button">レベル選択へ戻る</button>
            </div>
          </section>
          <ol id="gameBattleLog" class="game-battle-log" aria-label="戦闘ログ"></ol>
        </section>
      </section>
    `;
  }

  cache() {
    const byId = (id) => this.root.querySelector(`#${id}`);
    this.elements = {
      canvas: byId("gameCanvas"),
      playerLevel: byId("gamePlayerLevel"),
      gold: byId("gameGold"),
      wins: byId("gameWins"),
      losses: byId("gameLosses"),
      maxClear: byId("gameMaxClear"),
      hud: byId("gameHud"),
      stageControls: byId("stageControls"),
      stageSelect: byId("stageSelect"),
      stageEnemyName: byId("stageEnemyName"),
      stageEnemyLevel: byId("stageEnemyLevel"),
      stageReward: byId("stageReward"),
      startButton: byId("startBattleButton"),
      battleControls: byId("battleControls"),
      battleTurn: byId("battleTurn"),
      skillGrid: byId("gameSkillGrid"),
      result: byId("gameResult"),
      resultText: byId("gameResultText"),
      retryButton: byId("retryBattleButton"),
      returnButton: byId("returnStageButton"),
      log: byId("gameBattleLog"),
      playerHudLevel: byId("hudPlayerLevel"),
      playerHp: byId("hudPlayerHp"),
      playerHpBar: byId("hudPlayerHpBar"),
      playerMp: byId("hudPlayerMp"),
      playerMpBar: byId("hudPlayerMpBar"),
      enemyName: byId("hudEnemyName"),
      enemyLevel: byId("hudEnemyLevel"),
      enemyHp: byId("hudEnemyHp"),
      enemyHpBar: byId("hudEnemyHpBar"),
    };

    GAME_SKILLS.forEach((skill) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "game-skill-button";
      button.dataset.skillId = skill.id;

      const icon = document.createElement("span");
      icon.className = "game-skill-icon";
      icon.textContent = skill.icon;

      const name = document.createElement("strong");
      name.textContent = skill.name;

      const cost = document.createElement("small");
      cost.textContent = `MP ${skill.mpCost}`;

      const description = document.createElement("span");
      description.className = "game-skill-description";
      description.textContent = skill.description;

      button.append(icon, name, cost, description);
      this.elements.skillGrid.append(button);
      this.skillButtons.set(skill.id, button);
    });
  }

  bind() {
    this.elements.stageSelect.addEventListener("change", () => {
      this.actions.selectStage(Number(this.elements.stageSelect.value));
    });
    this.elements.startButton.addEventListener("click", this.actions.startBattle);
    this.elements.retryButton.addEventListener("click", this.actions.retryBattle);
    this.elements.returnButton.addEventListener("click", this.actions.returnToStages);

    this.skillButtons.forEach((button, skillId) => {
      button.addEventListener("click", () => this.actions.useSkill(skillId));
    });
  }

  get canvas() {
    return this.elements.canvas;
  }

  setStageOptions(levels, selectedLevel) {
    this.elements.stageSelect.replaceChildren();
    levels.forEach((level) => {
      const option = document.createElement("option");
      option.value = String(level);
      option.textContent = `BATTLE LEVEL ${level}`;
      option.selected = level === selectedLevel;
      this.elements.stageSelect.append(option);
    });
  }

  renderStats(playerLevel, save) {
    setText(this.elements.playerLevel, playerLevel);
    setText(this.elements.gold, save.gold);
    setText(this.elements.wins, save.wins);
    setText(this.elements.losses, save.losses);
    setText(this.elements.maxClear, save.highestClearedLevel);
  }

  renderStage(stage) {
    this.elements.stageSelect.value = String(stage.level);
    setText(this.elements.stageEnemyName, stage.enemyName);
    setText(this.elements.stageEnemyLevel, `ENEMY LEVEL ${stage.level}`);
    setText(this.elements.stageReward, `勝利報酬 +${stage.goldReward} GOLD`);
  }

  showStageSelection() {
    this.elements.stageControls.hidden = false;
    this.elements.battleControls.hidden = true;
    this.elements.hud.hidden = true;
  }

  showBattle() {
    this.elements.stageControls.hidden = true;
    this.elements.battleControls.hidden = false;
    this.elements.hud.hidden = false;
  }

  renderBattle(state, locked = false) {
    setText(
      this.elements.battleTurn,
      state.status === "playing"
        ? `TURN ${state.turn} / ${locked ? "ACTION" : "YOUR TURN"}`
        : state.status.toUpperCase(),
    );

    setText(this.elements.playerHudLevel, `LV.${state.player.level}`);
    setText(this.elements.playerHp, `${state.player.hp} / ${state.player.maxHp}`);
    setText(this.elements.playerMp, `${state.player.mp} / ${state.player.maxMp}`);
    setMeter(this.elements.playerHpBar, state.player.hp, state.player.maxHp);
    setMeter(this.elements.playerMpBar, state.player.mp, state.player.maxMp);

    setText(this.elements.enemyName, state.enemy.name);
    setText(this.elements.enemyLevel, `LV.${state.enemy.level}`);
    setText(this.elements.enemyHp, `${state.enemy.hp} / ${state.enemy.maxHp}`);
    setMeter(this.elements.enemyHpBar, state.enemy.hp, state.enemy.maxHp);

    GAME_SKILLS.forEach((skill) => {
      const button = this.skillButtons.get(skill.id);
      button.disabled =
        locked ||
        state.status !== "playing" ||
        state.player.mp < skill.mpCost;
    });

    this.elements.log.replaceChildren();
    state.log.forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      this.elements.log.append(item);
    });
    this.elements.log.scrollTop = this.elements.log.scrollHeight;

    const finished = state.status !== "playing" && !locked;
    this.elements.result.hidden = !finished;
    this.elements.skillGrid.hidden = state.status !== "playing";

    if (finished) {
      this.elements.result.className = `game-result ${state.status}`;
      setText(
        this.elements.resultText,
        state.status === "victory"
          ? `VICTORY! +${state.goldReward} GOLD`
          : "DEFEAT / GOLDは失いません",
      );
    }
  }
}
