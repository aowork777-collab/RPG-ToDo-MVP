import { GAME_HEIGHT, GAME_WIDTH } from "../config.mjs";
import { GAME_SKILLS } from "../data/skills.mjs";
import { createPlayerState, damageRange } from "../battle/combat-rules.mjs";
import { MONSTERS } from "../data/monsters.mjs";

function text(node, value) { if (node) node.textContent = String(value); }
function meter(node, current, max) {
  node.style.width = Math.max(0, Math.min(100, current / max * 100)) + "%";
}
export class GameUI {
  constructor(root, actions) {
    this.root = root; this.actions = actions; this.skillButtons = new Map();
    this.build(); this.cache(); this.bind();
  }
  build() {
    this.root.innerHTML = `
      <section class="game-status" aria-label="ToDoレベルと戦績">
        <div class="status-level"><span>TODO PLAYER LEVEL</span><strong id="gamePlayerLevel">1</strong><small>日々の達成が、あなたの力に。</small></div>
        <div><span>GOLD</span><strong id="gameGold">0</strong></div>
        <div><span>勝利</span><strong id="gameWins">0</strong></div>
        <div><span>敗北</span><strong id="gameLosses">0</strong></div>
        <div><span>最高クリア</span><strong id="gameMaxClear">0</strong></div>
      </section>
      <p id="gameMessage" class="game-message" role="status" hidden></p>
      <section class="game-screen-panel">
        <header class="arena-toolbar">
          <div><span class="game-kicker">BATTLE FIELD</span><strong id="arenaRegion">月明かりの森</strong></div>
          <div class="arena-options">
            <button id="soundButton" type="button" class="game-option" aria-pressed="false">音 OFF</button>
            <button id="motionButton" type="button" class="game-option" aria-pressed="false">演出 通常</button>
            <button id="speedButton" type="button" class="game-option">速度 1×</button>
          </div>
        </header>
        <div class="game-canvas-wrap">
          <canvas id="gameCanvas" class="game-canvas" width="${GAME_WIDTH}" height="${GAME_HEIGHT}" aria-label="プレイヤーと敵の戦闘アニメーション。HPと行動は下の操作欄でも確認できます。"></canvas>
          <div class="arena-caption" id="arenaCaption"><span>READY TO BATTLE</span><strong>今日の努力で、次の一戦へ。</strong></div>
          <div class="game-hud" id="gameHud" hidden>
            <article class="hud-card player-hud">
              <div class="hud-heading"><span>YOU</span><strong id="hudPlayerLevel">LV.1</strong></div>
              <div class="hud-value"><span>HP</span><strong id="hudPlayerHp"></strong></div>
              <div class="hud-track"><span id="hudPlayerHpBar" class="hud-bar player-hp"></span></div>
              <div class="hud-value"><span>MP</span><strong id="hudPlayerMp"></strong></div>
              <div class="hud-track mp-track"><span id="hudPlayerMpBar" class="hud-bar player-mp"></span></div>
            </article>
            <article class="hud-card enemy-hud">
              <div class="hud-heading"><span id="hudEnemyName"></span><strong id="hudEnemyLevel"></strong></div>
              <div class="hud-value"><span>HP</span><strong id="hudEnemyHp"></strong></div>
              <div class="hud-track"><span id="hudEnemyHpBar" class="hud-bar enemy-hp"></span></div>
              <span class="enemy-role" id="enemyRole">ENEMY</span>
            </article>
          </div>
        </div>
        <section class="stage-controls" id="stageControls">
          <div class="stage-heading"><p class="game-kicker">CHOOSE YOUR CHALLENGE</p><h1>次の相手を選ぶ</h1><p id="stageDifficulty" class="stage-difficulty"></p></div>
          <div class="stage-picker">
            <label for="monsterSelect">モンスター</label>
            <select id="monsterSelect" class="game-stage-select"><option value="auto">レベルに応じておまかせ</option></select>
            <label for="stageSelect">敵のレベル</label>
            <div class="stage-select-row">
              <button type="button" id="prevStage" class="game-option" aria-label="敵レベルを1下げる">−</button>
              <select id="stageSelect" class="game-stage-select"></select>
              <button type="button" id="nextStage" class="game-option" aria-label="敵レベルを1上げる">＋</button>
            </div>
            <button type="button" id="matchLevel" class="game-text-button">自分のレベルに合わせる</button>
          </div>
          <div class="stage-copy"><strong id="stageEnemyName"></strong><span id="stageEnemyLevel"></span><span id="stageEnemyStats"></span><b id="stageReward"></b></div>
          <div class="monster-guide"><span id="monsterTag" class="monster-tag"></span><p id="monsterDescription"></p><ol id="monsterPattern" class="monster-pattern"></ol></div>
          <button id="startBattleButton" class="game-primary-button" type="button">戦闘開始 <span aria-hidden="true"> →</span></button>
          <p class="stage-note">プレイヤーの強さはToDoのレベルから計算。戦闘でXPは増減しません。</p>
        </section>
        <section class="battle-controls" id="battleControls" hidden>
          <div class="battle-turn-row"><p id="battleTurn" class="game-kicker" role="status"></p><span class="keyboard-hint">技選択 1–4</span></div>
          <div id="enemyIntent" class="enemy-intent"></div>
          <div id="gameSkillGrid" class="game-skill-grid"></div>
          <section id="gameResult" class="game-result" hidden tabindex="-1">
            <span id="gameResultLabel" class="game-kicker"></span><h2 id="gameResultText"></h2><p id="gameResultDetail"></p>
            <div class="result-actions"><button id="retryBattleButton" class="game-primary-button" type="button">もう一度挑戦</button><button id="returnStageButton" class="game-secondary-button" type="button">相手を選び直す</button></div>
          </section>
          <details class="battle-log-details"><summary>戦闘ログ <span id="lastLog"></span></summary><ol id="gameBattleLog" class="game-battle-log"></ol></details>
        </section>
      </section>
      <details class="monster-codex"><summary>モンスター図鑑 <span id="codexProgress">0 / 10 討伐</span></summary><div id="monsterCodexList" class="monster-codex-list"></div></details>`;
  }
  cache() {
    this.elements = {};
    this.root.querySelectorAll("[id]").forEach(node => { this.elements[node.id] = node; });
    MONSTERS.forEach(monster => {
      const option = document.createElement("option");
      option.value = monster.id; option.textContent = monster.name + " · " + monster.tag;
      this.elements.monsterSelect.append(option);
    });
    GAME_SKILLS.forEach((skill, index) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "game-skill-button";
      button.dataset.skillId = skill.id;
      const number = document.createElement("span"); number.className = "skill-number"; number.textContent = "0" + (index + 1);
      const name = document.createElement("strong"); name.textContent = skill.name;
      const cost = document.createElement("small"); cost.textContent = "MP " + skill.mpCost;
      const description = document.createElement("span"); description.className = "game-skill-description"; description.textContent = skill.description;
      const estimate = document.createElement("span"); estimate.className = "skill-estimate";
      button.append(number, name, cost, description, estimate);
      this.elements.gameSkillGrid.append(button);
      this.skillButtons.set(skill.id, button);
    });
  }
  bind() {
    const e = this.elements;
    e.monsterSelect.addEventListener("change", () => this.actions.selectMonster(e.monsterSelect.value));
    e.stageSelect.addEventListener("change", () => this.actions.selectStage(Number(e.stageSelect.value)));
    e.prevStage.addEventListener("click", () => this.actions.selectStage(Number(e.stageSelect.value) - 1));
    e.nextStage.addEventListener("click", () => this.actions.selectStage(Number(e.stageSelect.value) + 1));
    e.matchLevel.addEventListener("click", () => this.actions.selectStage(this.playerLevel));
    e.startBattleButton.addEventListener("click", this.actions.startBattle);
    e.retryBattleButton.addEventListener("click", this.actions.retryBattle);
    e.returnStageButton.addEventListener("click", this.actions.returnToStages);
    e.soundButton.addEventListener("click", async () => {
      const enabled = await this.actions.toggleSound();
      text(e.soundButton, enabled ? "音 ON" : "音 OFF");
      e.soundButton.setAttribute("aria-pressed", String(enabled));
    });
    e.motionButton.addEventListener("click", () => this.actions.toggleMotion());
    e.speedButton.addEventListener("click", () => text(e.speedButton, "速度 " + this.actions.toggleSpeed() + "×"));
    this.skillButtons.forEach((button, id) => button.addEventListener("click", () => this.actions.useSkill(id)));
    this.onKey = event => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.target.isContentEditable) return;
      const skill = GAME_SKILLS[Number(event.key) - 1];
      const button = skill && this.skillButtons.get(skill.id);
      if (!e.battleControls.hidden && button && !button.disabled) { event.preventDefault(); button.click(); }
    };
    document.addEventListener("keydown", this.onKey);
  }
  destroy() { document.removeEventListener("keydown", this.onKey); }
  get canvas() { return this.elements.gameCanvas; }
  message(message) { text(this.elements.gameMessage, message); this.elements.gameMessage.hidden = !message; }
  setMotion(reduced) {
    text(this.elements.motionButton, reduced ? "演出 控えめ" : "演出 通常");
    this.elements.motionButton.setAttribute("aria-pressed", String(reduced));
    this.root.classList.toggle("reduced-motion", reduced);
  }
  setStageOptions(levels, selectedLevel) {
    this.elements.stageSelect.replaceChildren();
    levels.forEach(level => {
      const option = document.createElement("option");
      option.value = String(level); option.textContent = "LEVEL " + level;
      option.selected = level === selectedLevel;
      this.elements.stageSelect.append(option);
    });
  }
  renderStats(playerLevel, save) {
    this.playerLevel = playerLevel;
    const e = this.elements;
    text(e.gamePlayerLevel, playerLevel); text(e.gameGold, save.gold.toLocaleString("ja-JP"));
    text(e.gameWins, save.wins); text(e.gameLosses, save.losses); text(e.gameMaxClear, save.highestClearedLevel);
    text(e.codexProgress, MONSTERS.filter(m => save.defeatedMonsters?.[m.id] > 0).length + " / " + MONSTERS.length + " 討伐");
    e.monsterCodexList.replaceChildren();
    MONSTERS.forEach(monster => {
      const card = document.createElement("article"); card.className = "codex-entry";
      const name = document.createElement("strong"); name.textContent = monster.name;
      const count = document.createElement("span"); count.textContent = "討伐 " + (save.defeatedMonsters?.[monster.id] || 0) + " 回";
      const copy = document.createElement("p"); copy.textContent = monster.description;
      card.append(name, count, copy); e.monsterCodexList.append(card);
    });
  }
  renderStage(stage, selectedMonster = "auto") {
    const e = this.elements;
    e.stageSelect.value = String(stage.level);
    e.monsterSelect.value = selectedMonster;
    text(e.monsterTag, stage.monster.tag);
    text(e.monsterDescription, stage.monster.description);
    e.monsterPattern.replaceChildren();
    stage.monster.pattern.forEach((move, index) => {
      const item = document.createElement("li"); item.textContent = (index + 1) + ". " + move.name + (move.hits > 1 ? " ×" + move.hits : "");
      e.monsterPattern.append(item);
    });
    this.root.style.setProperty("--monster-accent", stage.monster.color);
    e.prevStage.disabled = stage.level <= 1;
    e.nextStage.disabled = stage.level >= e.stageSelect.options.length;
    text(e.arenaRegion, stage.region);
    text(e.stageEnemyName, stage.enemyName); text(e.stageEnemyLevel, "ENEMY LEVEL " + stage.level);
    text(e.stageEnemyStats, "HP " + stage.enemyMaxHp + "  /  攻撃力 " + stage.enemyAttack);
    text(e.stageReward, "勝利報酬 +" + stage.goldReward + " GOLD");
    const player = createPlayerState(this.playerLevel);
    const gap = stage.level - this.playerLevel;
    text(e.stageDifficulty, (gap > 3 ? "高難度" : gap > 0 ? "挑戦" : gap < -2 ? "余裕あり" : "同格") + " · あなたのHP " + player.maxHp + " / 攻撃力 " + player.attack);
  }
  showStageSelection() {
    const e = this.elements;
    e.stageControls.hidden = false; e.battleControls.hidden = true; e.gameHud.hidden = true; e.arenaCaption.hidden = false;
  }
  showBattle() {
    const e = this.elements;
    e.stageControls.hidden = true; e.battleControls.hidden = false; e.gameHud.hidden = false; e.arenaCaption.hidden = true;
    this.skillButtons.get("attack").focus({ preventScroll: true });
  }
  renderBattle(state, locked = false) {
    const e = this.elements;
    const finished = state.status !== "playing" && !locked;
    const resultWasHidden = e.gameResult.hidden;
    text(e.battleTurn, state.status === "playing" ? "TURN " + String(state.turn).padStart(2, "0") + " / " + (locked ? state.phase === "enemy" ? "敵のターン" : "行動中" : "あなたのターン") : "BATTLE FINISHED");
    text(e.hudPlayerLevel, "LV." + state.player.level);
    text(e.hudPlayerHp, state.player.hp + " / " + state.player.maxHp);
    text(e.hudPlayerMp, state.player.mp + " / " + state.player.maxMp);
    meter(e.hudPlayerHpBar, state.player.hp, state.player.maxHp);
    meter(e.hudPlayerMpBar, state.player.mp, state.player.maxMp);
    e.hudPlayerHpBar.classList.toggle("low-hp", state.player.hp / state.player.maxHp < 0.3);
    text(e.hudEnemyName, state.enemy.name); text(e.hudEnemyLevel, "LV." + state.enemy.level);
    text(e.hudEnemyHp, state.enemy.hp + " / " + state.enemy.maxHp);
    meter(e.hudEnemyHpBar, state.enemy.hp, state.enemy.maxHp);
    e.enemyIntent.hidden = state.status !== "playing";
    e.enemyIntent.classList.toggle("danger", state.intent.strong);
    const intent = state.intent;
    const intentDetail = intent.type === "guard" ? "次に受ける一撃を半減" : intent.type === "heal" ? "最大HPの12%を回復" : intent.min + "–" + intent.max + " ダメージ" + (intent.hits > 1 ? "（" + intent.hits + "連撃の合計）" : "") + (intent.drain ? " / HP吸収" : "");
    text(e.enemyIntent, (intent.enraged ? "怒り状態 · " : "") + "敵の次の行動： " + intent.name + " · " + intentDetail + (intent.strong ? " / ガード推奨" : ""));
    text(e.enemyRole, state.enemy.guarding ? "防御中 · 次の一撃を半減" : intent.enraged ? "ENRAGED · 攻撃力 +15%" : "ENEMY");
    GAME_SKILLS.forEach(skill => {
      const button = this.skillButtons.get(skill.id);
      const fullHp = skill.type === "heal" && state.player.hp >= state.player.maxHp;
      const insufficient = state.player.mp < skill.mpCost;
      button.disabled = locked || state.status !== "playing" || insufficient || fullHp;
      let detail = "";
      if (skill.type === "attack") { const range = damageRange(state.player.attack * skill.power); if (state.enemy.guarding) { range.min = Math.max(1, Math.floor(range.min / 2)); range.max = Math.max(1, Math.floor(range.max / 2)); } detail = range.min + "–" + range.max + " ダメージ"; }
      if (skill.type === "heal") detail = "HP +" + Math.min(state.player.maxHp - state.player.hp, Math.floor(state.player.maxHp * skill.healRate));
      if (skill.type === "guard") detail = "ダメージ半減 / MP +6";
      if (insufficient) detail = "MPが足りません";
      else if (fullHp) detail = "HPは満タンです";
      text(button.querySelector(".skill-estimate"), detail);
    });
    e.gameBattleLog.replaceChildren();
    state.log.forEach(line => { const li = document.createElement("li"); li.textContent = line; e.gameBattleLog.append(li); });
    text(e.lastLog, state.log.at(-1) || "");
    e.gameResult.hidden = !finished;
    e.gameSkillGrid.hidden = state.status !== "playing";
    if (finished) {
      e.gameResult.className = "game-result " + state.status;
      text(e.gameResultLabel, state.status === "victory" ? "QUEST FOR GLORY" : "NEXT TIME");
      text(e.gameResultText, state.status === "victory" ? "VICTORY" : state.status === "error" ? "戦闘を中断しました" : "DEFEAT");
      text(e.gameResultDetail, state.status === "victory" ? "+" + state.goldReward + " GOLD · " + state.turn + "ターンで撃破" : "ToDoのXP・レベル・所持GOLDは減りません。");
      if (resultWasHidden) e.gameResult.focus({ preventScroll: true });
    }
  }
}
