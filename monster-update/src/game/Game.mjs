import { readTodoProgress } from "./bridge/todo-level.mjs";
import { BattleController } from "./battle/battle-controller.mjs";
import { AssetLoader } from "./core/asset-loader.mjs";
import { GameLoop } from "./core/game-loop.mjs";
import { TweenManager } from "./core/tween.mjs";
import { BattleAudio } from "./core/audio.mjs";
import {
  ENEMY_HOME,
  PLAYER_HOME,
  PLAYER_SPRITE,
  PLAYER_SPRITE_URL,
  ARENA_IMAGE_URL,
} from "./config.mjs";
import {
  getStage,
  getStageLevels,
} from "./data/stages.mjs";
import { Actor } from "./entities/actor.mjs";
import { normalizeMonsterId } from "./data/monsters.mjs";
import { CanvasRenderer } from "./rendering/canvas-renderer.mjs";
import { loadGameSave, saveGameSave } from "./storage/game-storage.mjs";
import { GameUI } from "./ui/game-ui.mjs";

export class Game {
  constructor(root) {
    this.root = root;
    this.todoProgress = null;
    this.save = null;
    this.stage = null;
    this.playerActor = null;
    this.enemyActor = null;
    this.controller = null;
    this.assets = new AssetLoader();
    this.tweens = new TweenManager();
    this.renderer = null;
    this.loop = null;
    this.audio = new BattleAudio();
    this.speed = 1;
    this.destroyed = false;
    this.ready = false;
    this.loadingStage = false;
    this.selectionRequest = 0;
    this.reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    this.selectStage = this.selectStage.bind(this);
    this.startBattle = this.startBattle.bind(this);
    this.retryBattle = this.retryBattle.bind(this);
    this.returnToStages = this.returnToStages.bind(this);
    this.useSkill = this.useSkill.bind(this);
    this.update = this.update.bind(this);
    this.render = this.render.bind(this);
  }

  async start() {
    this.todoProgress = readTodoProgress();
    this.save = loadGameSave();

    this.ui = new GameUI(this.root, {
      selectStage: this.selectStage,
      selectMonster: id => this.selectMonster(id),
      startBattle: this.startBattle,
      retryBattle: this.retryBattle,
      returnToStages: this.returnToStages,
      useSkill: this.useSkill,
      toggleSound: () => this.audio.toggle(),
      toggleSpeed: () => (this.speed = this.speed === 1 ? 1.5 : this.speed === 1.5 ? 2 : 1),
      toggleMotion: () => this.setMotion(!this.reducedMotion),
    });

    this.renderer = new CanvasRenderer(this.ui.canvas, this.assets);
    this.setMotion(this.reducedMotion);
    this.loop = new GameLoop(this.update, this.render);

    this.ui.setStageOptions(getStageLevels(), this.save.selectedStage);
    this.ui.renderStats(this.todoProgress.level, this.save);
    this.ui.elements.startBattleButton.disabled = true;
    this.ui.elements.startBattleButton.textContent = "戦場を準備しています…";

    await this.assets.preload([
      PLAYER_SPRITE_URL,
      ARENA_IMAGE_URL,
    ]);

    if (this.destroyed) return;
    this.ready = true;
    this.ui.elements.startBattleButton.disabled = false;
    this.ui.elements.startBattleButton.textContent = "戦闘開始 →";
    if (!this.assets.getImage(PLAYER_SPRITE_URL)) this.ui.message("キャラクター画像を読み込めなかったため、代替表示で続行します。assets/game/の配置を確認してください。");

    await this.selectStage(this.save.selectedStage, false);
    this.loop.start();
    this.onFocus = () => {
      if (!this.controller || (this.controller.state.status !== "playing" && !this.controller.locked)) {
        this.todoProgress = readTodoProgress();
        this.save = loadGameSave();
        this.ui.renderStats(this.todoProgress.level, this.save);
        if (!this.controller) this.selectStage(this.save.selectedStage, false);
      }
    };
    window.addEventListener("focus", this.onFocus);
    window.addEventListener("storage", this.onFocus);
  }

  setMotion(reduced) {
    this.reducedMotion = reduced;
    this.renderer.reducedMotion = reduced;
    this.ui.setMotion(reduced);
    if (this.playerActor) this.playerActor.reducedMotion = reduced;
    if (this.enemyActor) this.enemyActor.reducedMotion = reduced;
  }

  persist() {
    if (!saveGameSave(this.save)) this.ui.message("ゲームの戦績を保存できませんでした。この画面では続行できますが、再読み込みすると失われる場合があります。");
  }

  createActors(stage) {
    this.playerActor = new Actor({
      id: "player",
      name: "YOU",
      level: this.todoProgress.level,
      x: PLAYER_HOME.x,
      y: PLAYER_HOME.y,
      width: 220,
      height: 228,
      imageUrl: PLAYER_SPRITE_URL,
      sprite: PLAYER_SPRITE,
      fallback: "🧙‍♂️",
      facing: 1,
      reducedMotion: this.reducedMotion,
    });

    this.enemyActor = new Actor({
      id: stage.enemyId,
      name: stage.enemyName,
      level: stage.level,
      x: ENEMY_HOME.x,
      y: ENEMY_HOME.y,
      width: stage.enemySize,
      height: stage.enemySize,
      sprite: stage.enemySprite,
      imageUrl: stage.enemyImageUrl,
      fallback: stage.enemyFallback,
      facing: -1,
      motion: stage.monster.id === "slime" ? "slime" : ["demon", "phoenix"].includes(stage.monster.id) ? "flying" : "walker",
      reducedMotion: this.reducedMotion,
    });
  }

  selectMonster(id) {
    if (this.controller?.state.status === "playing" || this.controller?.locked) return;
    this.save.selectedMonster = normalizeMonsterId(id);
    return this.selectStage(this.save.selectedStage);
  }

  async selectStage(level, persist = true) {
    if (!this.ready || this.controller?.state.status === "playing" || this.controller?.locked) return;

    const request = ++this.selectionRequest;
    this.stage = getStage(level, this.save.selectedMonster);
    this.save.selectedStage = this.stage.level;
    if (persist) {
      this.save = { ...loadGameSave(), selectedStage: this.stage.level, selectedMonster: this.save.selectedMonster };
      this.persist();
    }

    this.loadingStage = true;
    this.ui.renderStage(this.stage, this.save.selectedMonster);
    this.ui.showStageSelection();
    this.ui.elements.startBattleButton.disabled = true;
    this.ui.elements.startBattleButton.textContent = "モンスターを準備しています…";
    const image = await this.assets.loadImage(this.stage.enemyImageUrl);
    if (this.destroyed || request !== this.selectionRequest) return;
    this.loadingStage = false;
    this.ui.elements.startBattleButton.disabled = false;
    this.ui.elements.startBattleButton.textContent = "戦闘開始 →";
    this.ui.message(image ? "" : "モンスター画像を読み込めませんでした。assets/game/enemies/ を確認してください。代替表示で続行できます。");
    this.tweens.clear();
    this.createActors(this.stage);
    this.renderer.setScene(this.stage, this.playerActor, this.enemyActor);
    this.ui.renderStats(this.todoProgress.level, this.save);
    this.ui.renderStage(this.stage, this.save.selectedMonster);
    this.ui.showStageSelection();
  }

  startBattle() {
    if (!this.ready || this.loadingStage || this.destroyed || this.controller?.locked || this.controller?.state.status === "playing") return;
    this.todoProgress = readTodoProgress();
    this.ui.renderStats(this.todoProgress.level, this.save);
    this.controller?.cancel();
    this.tweens.clear();
    this.createActors(this.stage);
    this.renderer.setScene(this.stage, this.playerActor, this.enemyActor);

    this.controller = new BattleController({
      stage: this.stage,
      playerLevel: this.todoProgress.level,
      playerActor: this.playerActor,
      enemyActor: this.enemyActor,
      tweens: this.tweens,
      renderer: this.renderer,
      audio: this.audio,
      onChange: (state, locked) => this.ui.renderBattle(state, locked),
      onFinish: (state) => this.finishBattle(state),
    });

    this.ui.renderBattle(this.controller.state, false);
    this.ui.showBattle();
  }

  async useSkill(skillId) {
    try {
      await this.controller?.useSkill(skillId);
    } catch (error) {
      console.error("戦闘アニメーションでエラーが発生しました", error);
    }
  }

  finishBattle(state) {
    this.save = { ...loadGameSave(), selectedStage: this.stage.level, selectedMonster: this.save.selectedMonster };
    if (state.status === "victory") {
      this.save.gold += state.goldReward;
      this.save.wins += 1;
      this.save.defeatedMonsters[this.stage.monster.id] = (this.save.defeatedMonsters[this.stage.monster.id] || 0) + 1;
      this.save.highestClearedLevel = Math.max(
        this.save.highestClearedLevel,
        this.stage.level,
      );
    } else {
      this.save.losses += 1;
    }

    this.persist();
    this.ui.renderStats(this.todoProgress.level, this.save);
  }

  retryBattle() {
    this.startBattle();
  }

  returnToStages() {
    if (this.controller?.state.status === "playing" || this.controller?.locked) return;
    this.controller?.cancel();
    this.controller = null;
    this.todoProgress = readTodoProgress();
    this.selectStage(this.save.selectedStage, false);
    this.ui.elements.stageSelect.focus({ preventScroll: true });
  }

  update(delta) {
    delta *= this.speed;
    this.tweens.update(delta);
    this.playerActor?.update(delta);
    this.enemyActor?.update(delta);
    this.renderer?.update(delta);
  }

  render(elapsed) {
    this.renderer?.render(elapsed);
  }

  destroy() {
    this.destroyed = true;
    this.controller?.cancel();
    this.loop?.stop();
    this.tweens.clear();
    this.ui?.destroy();
    this.audio.destroy();
    window.removeEventListener("focus", this.onFocus);
    window.removeEventListener("storage", this.onFocus);
  }
}
