import { readTodoProgress } from "./bridge/todo-level.mjs";
import { BattleController } from "./battle/battle-controller.mjs";
import { AssetLoader } from "./core/asset-loader.mjs";
import { GameLoop } from "./core/game-loop.mjs";
import { TweenManager } from "./core/tween.mjs";
import { ENEMY_HOME, PLAYER_HOME } from "./config.mjs";
import {
  getAllEnemyImageUrls,
  getStage,
  getStageLevels,
} from "./data/stages.mjs";
import { Actor } from "./entities/actor.mjs";
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
      startBattle: this.startBattle,
      retryBattle: this.retryBattle,
      returnToStages: this.returnToStages,
      useSkill: this.useSkill,
    });

    this.renderer = new CanvasRenderer(this.ui.canvas, this.assets);
    this.loop = new GameLoop(this.update, this.render);

    this.ui.setStageOptions(getStageLevels(), this.save.selectedStage);
    this.ui.renderStats(this.todoProgress.level, this.save);

    await this.assets.preload(getAllEnemyImageUrls());

    this.selectStage(this.save.selectedStage, false);
    this.loop.start();
  }

  createActors(stage) {
    this.playerActor = new Actor({
      id: "player",
      name: "YOU",
      level: this.todoProgress.level,
      x: PLAYER_HOME.x,
      y: PLAYER_HOME.y,
      width: 185,
      height: 185,
      imageUrl: null,
      fallback: "🧙‍♂️",
      facing: 1,
    });

    this.enemyActor = new Actor({
      id: stage.enemyId,
      name: stage.enemyName,
      level: stage.level,
      x: ENEMY_HOME.x,
      y: ENEMY_HOME.y,
      width: 235,
      height: 235,
      imageUrl: stage.enemyImageUrl,
      fallback: stage.enemyFallback,
      facing: -1,
    });
  }

  selectStage(level, persist = true) {
    if (this.controller?.state.status === "playing") return;

    this.stage = getStage(level);
    this.save.selectedStage = this.stage.level;
    if (persist) saveGameSave(this.save);

    this.tweens.clear();
    this.createActors(this.stage);
    this.renderer.setScene(this.stage, this.playerActor, this.enemyActor);
    this.ui.renderStage(this.stage);
    this.ui.renderStats(this.todoProgress.level, this.save);
    this.ui.showStageSelection();
  }

  startBattle() {
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
      onChange: (state, locked) => this.ui.renderBattle(state, locked),
      onFinish: (state) => this.finishBattle(state),
    });

    this.ui.showBattle();
    this.ui.renderBattle(this.controller.state, false);
  }

  async useSkill(skillId) {
    try {
      await this.controller?.useSkill(skillId);
    } catch (error) {
      console.error("戦闘アニメーションでエラーが発生しました", error);
    }
  }

  finishBattle(state) {
    if (state.status === "victory") {
      this.save.gold += state.goldReward;
      this.save.wins += 1;
      this.save.highestClearedLevel = Math.max(
        this.save.highestClearedLevel,
        this.stage.level,
      );
    } else {
      this.save.losses += 1;
    }

    saveGameSave(this.save);
    this.ui.renderStats(this.todoProgress.level, this.save);
  }

  retryBattle() {
    this.startBattle();
  }

  returnToStages() {
    if (this.controller?.state.status === "playing") return;
    this.controller = null;
    this.selectStage(this.save.selectedStage, false);
  }

  update(delta) {
    this.tweens.update(delta);
    this.playerActor?.update(delta);
    this.enemyActor?.update(delta);
    this.renderer?.update(delta);
  }

  render(elapsed) {
    this.renderer?.render(elapsed);
  }

  destroy() {
    this.loop?.stop();
    this.tweens.clear();
  }
}
