import { GAME_HEIGHT, GAME_WIDTH, MAX_BATTLE_LEVEL, BOSS_INTERVAL } from "../config.mjs";
import { GAME_SKILLS } from "../data/skills.mjs";
import { MONSTERS } from "../data/monsters.mjs";
import { getEnemyIntent, previewDamage } from "../battle/combat-rules.mjs";
import { canUseSkill, selectedEnemy, previewOrder } from "../battle/battle-engine.mjs";
import { isCampaignComplete } from "../storage/game-storage.mjs";

import { renderEquipmentShop } from "./equipment-ui.mjs";

const text = (node,value) => { node.textContent = String(value); };
const make = (tag,className,value = "") => { const node = document.createElement(tag); node.className = className; node.textContent = value; return node; };
function bar(node,current,max) { node.style.width = Math.max(0,Math.min(100,current / max * 100)) + "%"; }

export class GameUI {
  constructor(root,actions) {
    this.root = root; this.actions = actions; this.skillButtons = new Map(); this.targetButtons = new Map();
    this.build(); this.elements = {};
    root.querySelectorAll("[id]").forEach(node => { this.elements[node.id] = node; });
    this.bind();
  }
  build() {
    this.root.innerHTML = `
      <section class="game-status" aria-label="プレイヤーと遠征の記録">
        <div class="status-level"><span>TODO PLAYER LEVEL</span><strong id="gamePlayerLevel">1</strong></div>
        <div><span>GOLD</span><strong id="gameGold">0</strong></div>
        <div><span>遠征クリア</span><strong id="gameProgress">0 / 100</strong></div>
        <div><span>総勝利</span><strong id="gameWins">0</strong></div>
      </section>
      <p class="game-message" id="gameMessage" role="status" hidden></p>
      <section class="game-screen-panel">
        <header class="arena-toolbar">
          <div><span class="game-kicker" id="stageLabel">STAGE 01</span><strong id="arenaRegion"></strong><span id="bossBadge" class="boss-badge" hidden>BOSS</span></div>
          <div class="arena-options">
            <button id="soundButton" class="game-option" type="button" aria-pressed="false">音 OFF</button>
            <button id="motionButton" class="game-option" type="button" aria-pressed="false">演出 通常</button>
            <button id="speedButton" class="game-option" type="button">速度 1×</button>
          </div>
        </header>
        <div class="action-order-panel" id="orderPanel" hidden><span>行動順</span><ol id="actionOrder" class="action-order" aria-label="次の行動順"></ol></div>
        <div class="game-canvas-wrap">
          <canvas id="gameCanvas" width="${GAME_WIDTH}" height="${GAME_HEIGHT}" class="game-canvas" aria-label="戦闘アニメーション。攻撃対象は下の敵ボタンからも選べます。"></canvas>
          <div class="arena-caption" id="arenaCaption"><span>ASTRAL EXPEDITION</span><strong id="stageTitle">星影の遠征</strong></div>
        </div>
        <section class="camp-controls" id="campControls">
          <div class="campaign-route" id="campaignRoute" aria-label="遠征の進行"></div>
          <div class="camp-copy"><h1 id="campTitle">遠征を開始</h1><p id="campEnemies"></p><p id="campReward"></p></div>
          <button type="button" id="startBattleButton" class="game-primary-button" disabled>準備しています…</button>
          <p class="stage-note" id="campNote">勝利すると次のステージが開きます。5ステージごとにボスが出現。</p>
        </section>
        <section class="battle-controls" id="battleControls" hidden>
          <div class="battle-turn-row"><p class="game-kicker" id="battleTurn" role="status"></p><span class="keyboard-hint">技 1–4 / 必殺技 5</span></div>
          <div class="combat-information"><div class="target-grid" id="targetGrid" role="group" aria-label="攻撃対象"></div>
          <div id="enemyIntent" class="enemy-intent"></div>
          <section class="player-resources" aria-label="プレイヤーの状態">
            <div class="player-health"><div><strong>YOU <span id="hudPlayerLevel"></span></strong><span id="hudPlayerHp"></span></div><div class="resource-track"><span class="hp-fill" id="hudPlayerHpBar"></span></div></div>
            <div class="sp-resource"><span>SP <strong id="spCount"></strong></span><div id="spPips" class="sp-pips" aria-hidden="true"></div></div>
            <div class="energy-resource"><span>必殺技エネルギー <strong id="energyCount"></strong></span><div class="resource-track"><span id="energyBar" class="energy-fill"></span></div></div>
          </section>
          </div><div id="gameSkillGrid" class="game-skill-grid"></div>
          <section id="gameResult" class="game-result" tabindex="-1" hidden>
            <span id="resultLabel" class="game-kicker"></span><h2 id="resultTitle"></h2><p id="resultDetail"></p>
            <div class="result-actions">
              <button id="nextStageButton" class="game-primary-button" type="button">次のステージへ</button>
              <button id="retryBattleButton" class="game-primary-button" type="button">再挑戦</button>
              <button id="campButton" class="game-secondary-button" type="button">遠征状況へ</button>
              <a class="game-secondary-button" href="./index.html">ToDoへ戻る</a>
            </div>
          </section>
          <details class="battle-log-details"><summary>戦闘ログ <span id="lastLog"></span></summary><ol id="gameBattleLog" class="game-battle-log"></ol></details>
        </section>
      </section>
      <details class="equipment-shop" open><summary>装備工房 <span>GOLDで冒険を強化</span></summary><div id="equipmentShop"></div></details>
      <details class="game-guide"><summary>戦闘の遊び方</summary><div>
        <p>通常攻撃でSPを1回復。戦闘スキル・回復スキルはSPを1消費します。SPは最大5です。</p>
        <p>攻撃や被弾でエネルギーがたまります。100で必殺技が使用可能。自分のターンに使用でき、使った後も通常の行動を選べます。</p>
        <p>防御は次の自分のターンまで有効。HP・SP・エネルギーは戦闘開始時にリセットされます。</p>
        <p>強さはToDoのPLAYER LEVELで決まります。戦闘でToDoのXPは増減しません。</p>
      </div></details>
      <details class="monster-codex"><summary>モンスター図鑑 <span id="codexProgress"></span></summary><div id="monsterCodexList" class="monster-codex-list"></div></details>`;
  }
  bind() {
    const e = this.elements;
    e.startBattleButton.addEventListener("click", this.actions.startBattle);
    e.nextStageButton.addEventListener("click", this.actions.nextStage);
    e.retryBattleButton.addEventListener("click", this.actions.retry);
    e.campButton.addEventListener("click", this.actions.returnToCamp);
    e.soundButton.addEventListener("click", async () => {
      const enabled = await this.actions.toggleSound();
      text(e.soundButton,enabled ? "音 ON" : "音 OFF"); e.soundButton.setAttribute("aria-pressed",String(enabled));
    });
    e.speedButton.addEventListener("click", () => text(e.speedButton,"速度 " + this.actions.toggleSpeed() + "×"));
    e.motionButton.addEventListener("click",this.actions.toggleMotion);
    e.gameCanvas.addEventListener("click", event => {
      const rect = e.gameCanvas.getBoundingClientRect();
      this.actions.selectTargetAt((event.clientX-rect.left)/rect.width*GAME_WIDTH, (event.clientY-rect.top)/rect.height*GAME_HEIGHT);
    });
    for (const [index,skill] of GAME_SKILLS.entries()) {
      const button = make("button","game-skill-button" + (skill.id === "ultimate" ? " ultimate-button" : ""));
      button.type = "button";
      button.append(make("span","skill-number",String(index+1).padStart(2,"0") + " / " + skill.name),
        make("strong","",skill.subtitle),make("small","skill-subtitle",skill.id === "ultimate" ? "全体攻撃 · 行動消費なし" : skill.type === "heal" ? "自分を回復" : skill.type === "guard" ? "次の自分の番まで有効" : skill.splash ? "対象 + 隣接" : "敵単体"),
        make("span","skill-cost",skill.energyCost ? "ENERGY 100" : skill.spCost ? "SP −1" : "SP +1"),
        make("span","skill-estimate",""));
      button.addEventListener("click",() => { this.lastSkill = skill.id; this.actions.useSkill(skill.id); });
      e.gameSkillGrid.append(button); this.skillButtons.set(skill.id,button);
    }
    this.onKey = event => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.target.isContentEditable || e.battleControls.hidden) return;
      const skill = GAME_SKILLS[Number(event.key)-1], button = skill && this.skillButtons.get(skill.id);
      if (button && !button.disabled) { event.preventDefault(); button.click(); }
    };
    document.addEventListener("keydown",this.onKey);
  }
  get canvas() { return this.elements.gameCanvas; }
  destroy() { document.removeEventListener("keydown",this.onKey); }
  message(value) { text(this.elements.gameMessage,value); this.elements.gameMessage.hidden = !value; }
  setMotion(value) {
    text(this.elements.motionButton,value ? "演出 控えめ" : "演出 通常");
    this.elements.motionButton.setAttribute("aria-pressed",String(value)); this.root.classList.toggle("reduced-motion",value);
  }
  renderStats(level,save) {
    this.save = save; const e = this.elements;
    renderEquipmentShop(e.equipmentShop,save,this.actions,Boolean(this.battleActive));
    text(e.gamePlayerLevel,level); text(e.gameGold,save.gold.toLocaleString("ja-JP"));
    text(e.gameProgress,save.clearedStage + " / " + MAX_BATTLE_LEVEL); text(e.gameWins,save.wins);
    text(e.codexProgress,MONSTERS.filter(m => save.defeatedMonsters?.[m.id] > 0).length + " / " + MONSTERS.length);
    e.monsterCodexList.replaceChildren();
    for (const monster of MONSTERS) {
      const card = make("article","codex-entry");
      card.append(make("strong","",monster.name),make("span","","討伐 " + (save.defeatedMonsters?.[monster.id] || 0) + " 回"));
      e.monsterCodexList.append(card);
    }
  }
  showCamp(stage,save,loading) {
    const e = this.elements, complete = isCampaignComplete(save);
    this.battleActive=false;renderEquipmentShop(e.equipmentShop,save,this.actions,false);
    e.campControls.hidden = false; e.battleControls.hidden = true; e.arenaCaption.hidden = false; e.orderPanel.hidden = true;
    text(e.stageLabel,"STAGE " + String(stage.level).padStart(2,"0")); text(e.arenaRegion,stage.region); e.bossBadge.hidden = !stage.isBoss;
    text(e.stageTitle,complete ? "遠征を制覇しました" : stage.title);
    text(e.campTitle,complete ? "全100ステージをクリア！" : "STAGE " + stage.level + (stage.isBoss ? " · ボス戦" : ""));
    text(e.campEnemies,stage.enemies.map(enemy => enemy.name).join(" / "));
    text(e.campReward,complete ? "日々の達成が、この冒険の力になりました。" : "勝利報酬 +" + stage.goldReward + " GOLD · 次のボス STAGE " + stage.nextBoss);
    text(e.startBattleButton,loading ? "戦場を準備しています…" : complete ? "遠征クリア" : stage.isBoss ? "ボスに挑む" : "戦闘開始");
    e.startBattleButton.disabled = loading || complete;
    e.campaignRoute.replaceChildren();
    const from = Math.floor((stage.level-1)/BOSS_INTERVAL)*BOSS_INTERVAL+1;
    for (let level=from; level<from+BOSS_INTERVAL && level<=MAX_BATTLE_LEVEL; level++) {
      const done = level<=save.clearedStage, current = level===stage.level && !complete;
      const node = make("div","route-stop" + (done ? " cleared" : current ? " current" : " locked") + (level%BOSS_INTERVAL===0 ? " boss" : ""));
      node.append(make("span","",done ? "✓" : current ? "現在地" : "未到達"),make("strong","",String(level).padStart(2,"0")),make("small","",level%BOSS_INTERVAL===0 ? "BOSS" : "STAGE"));
      e.campaignRoute.append(node);
    }
  }
  showBattle() {
    this.battleActive=true;renderEquipmentShop(this.elements.equipmentShop,this.save,this.actions,true);
    const e=this.elements; e.campControls.hidden=true; e.battleControls.hidden=false; e.arenaCaption.hidden=true; e.orderPanel.hidden=false;
    this.targetButtons.clear(); e.targetGrid.replaceChildren();
  }
  renderTargets(state,locked) {
    const e=this.elements;
    for(const enemy of state.enemies) {
      let button=this.targetButtons.get(enemy.id);
      if(!button) {
        button=make("button","enemy-target"); button.type="button";
        button.append(make("strong","target-name"),make("span","target-hp"),make("div","target-track"),make("span","target-state"));
        button.querySelector(".target-track").append(make("span","enemy-hp-fill"));
        button.addEventListener("click",()=>this.actions.selectTarget(enemy.id));
        e.targetGrid.append(button); this.targetButtons.set(enemy.id,button);
      }
      button.disabled=locked || enemy.hp<=0 || state.status!=="playing";
      button.setAttribute("aria-pressed",String(enemy.id===state.selectedTargetId && enemy.hp>0));
      button.classList.toggle("defeated",enemy.hp<=0);
      text(button.querySelector(".target-name"),enemy.name + (enemy.isBoss ? " · BOSS" : ""));
      text(button.querySelector(".target-hp"),"HP " + enemy.hp + " / " + enemy.maxHp);
      bar(button.querySelector(".enemy-hp-fill"),enemy.hp,enemy.maxHp);
      text(button.querySelector(".target-state"),enemy.hp<=0 ? "撃破" : enemy.guarding ? "防御中 · ダメージ半減" : enemy.isBoss && enemy.hp/enemy.maxHp<=.4 ? "怒り · 攻撃力上昇" : enemy.id===state.selectedTargetId ? "攻撃対象に選択中" : "タップして攻撃対象にする");
    }
  }
  renderBattle(state,locked) {
    const e=this.elements, finished=state.status!=="playing" && !locked, resultWasHidden=e.gameResult.hidden;
    text(e.battleTurn,state.status==="playing" ? "TURN " + String(state.turn).padStart(2,"0") + " / " + (locked ? state.phase==="enemy" ? "敵の行動" : "行動中" : "あなたの行動") : "BATTLE FINISHED");
    e.actionOrder.replaceChildren();
    if(state.status==="playing") previewOrder(state).forEach((entry,index)=>{
      const node=make("li","order-unit" + (entry.isPlayer ? " player" : "") + (index===0 ? " active" : ""));
      node.append(make("span","",index===0 ? "NOW" : "+" + entry.value),make("strong","",entry.name)); e.actionOrder.append(node);
    });
    this.renderTargets(state,locked);
    const target=selectedEnemy(state);
    e.enemyIntent.hidden=state.status!=="playing";
    if(target) {
      const intent=getEnemyIntent(target.actionCount,target.attack,target.monster,target);
      const detail=intent.name + (intent.type==="attack" ? " · " + intent.min + "–" + intent.max + " ダメージ" : intent.type==="heal" ? " · HP回復" : " · 次の被ダメージ半減");
      text(e.enemyIntent,target.name + "の予告：" + detail + (intent.enraged ? " / 怒り +15%" : ""));
      e.enemyIntent.classList.toggle("danger",intent.strong);
    }
    text(e.hudPlayerLevel,"LV." + state.player.level);
    text(e.hudPlayerHp,state.player.hp + " / " + state.player.maxHp + (state.player.guarding ? " · 防御中" : ""));
    bar(e.hudPlayerHpBar,state.player.hp,state.player.maxHp);
    text(e.spCount,state.sp + " / " + state.maxSp); e.spPips.replaceChildren();
    for(let i=0;i<state.maxSp;i++) e.spPips.append(make("span",i<state.sp ? "filled" : ""));
    text(e.energyCount,state.player.energy + " / 100"); bar(e.energyBar,state.player.energy,100);
    for(const skill of GAME_SKILLS) {
      const button=this.skillButtons.get(skill.id);
      button.disabled=locked || !canUseSkill(state,skill.id);
      button.classList.toggle("ready",skill.id==="ultimate" && state.player.energy>=100);
      let detail=skill.description;
      if(skill.energyCost && state.player.energy<100) detail="あと " + (100-state.player.energy) + " エネルギー";
      else if(state.sp<skill.spCost) detail="SP不足 · 通常攻撃で回復";
      else if(skill.type==="attack" && target) {
        const range=previewDamage(state.player,target,skill);
        detail=range.min + "–" + range.max + " ダメージ" + (skill.all ? " / 全体" : skill.splash ? " / 隣接にも攻撃" : "");
      } else if(skill.type==="heal") detail=state.player.hp===state.player.maxHp ? "HPは満タンです" : "HP +" + Math.min(state.player.maxHp-state.player.hp,Math.floor(state.player.maxHp*skill.healRate));
      text(button.querySelector(".skill-estimate"),detail);
    }
    e.gameSkillGrid.hidden=state.status!=="playing"; e.gameResult.hidden=!finished;
    e.gameBattleLog.replaceChildren();
    state.log.forEach(line=>e.gameBattleLog.append(make("li","",line))); text(e.lastLog,state.log.at(-1) || "");
    if(finished) {
      this.battleActive=false;renderEquipmentShop(e.equipmentShop,this.save,this.actions,false);
      const victory=state.status==="victory", complete=isCampaignComplete(this.save);
      text(e.resultLabel,victory ? state.isBoss ? "BOSS DEFEATED" : "STAGE CLEAR" : "TRY AGAIN");
      text(e.resultTitle,victory ? complete ? "遠征制覇" : "VICTORY" : state.status==="error" ? "戦闘を中断しました" : "DEFEAT");
      text(e.resultDetail,victory ? "+" + state.goldReward + " GOLD · " + (complete ? "全100ステージをクリア" : "次は STAGE " + (state.stageLevel+1)) : "同じステージから再挑戦できます。ToDoのXP・GOLDは減りません。");
      e.nextStageButton.hidden=!victory || complete; e.retryBattleButton.hidden=victory;
      if(resultWasHidden) e.gameResult.focus({preventScroll:true});
    } else if(!locked && this.wasLocked) {
      const button=this.skillButtons.get(this.lastSkill);
      if(button && !button.disabled && (document.activeElement===document.body || document.activeElement?.disabled)) button.focus({preventScroll:true});
    }
    this.wasLocked=locked;
  }
}
