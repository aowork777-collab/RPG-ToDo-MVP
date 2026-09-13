import { readTodoProgress } from "./bridge/todo-level.mjs";
import { BattleController } from "./battle/battle-controller.mjs";
import { AssetLoader } from "./core/asset-loader.mjs";
import { GameLoop } from "./core/game-loop.mjs";
import { TweenManager } from "./core/tween.mjs";
import { BattleAudio } from "./core/audio.mjs";
import { PLAYER_HOME, PLAYER_SPRITE, PLAYER_SPRITE_URL, ARENA_IMAGE_URL } from "./config.mjs";
import { getStage } from "./data/stages.mjs";
import { Actor } from "./entities/actor.mjs";
import { CanvasRenderer } from "./rendering/canvas-renderer.mjs";
import { loadGameSave, saveGameSave, getCurrentStage, isCampaignComplete, applyBattleResult } from "./storage/game-storage.mjs";
import { GameUI } from "./ui/game-ui.mjs";

export class Game {
  constructor(root) {
    this.root = root; this.assets = new AssetLoader(); this.tweens = new TweenManager();
    this.audio = new BattleAudio(); this.enemyActors = []; this.speed = 1; this.controller = null;
    this.destroyed = false; this.ready = false; this.loadingStage = false; this.request = 0; this.storageFailed = false;
    this.reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }
  async start() {
    this.todoProgress = readTodoProgress(); this.save = loadGameSave();
    this.ui = new GameUI(this.root, {
      startBattle: () => this.startBattle(), nextStage: () => this.prepareStage(),
      retry: () => this.startBattle(), returnToCamp: () => this.prepareStage(),
      useSkill: id => this.useSkill(id), selectTarget: id => this.controller?.selectTarget(id),
      selectTargetAt: (x, y) => {
        const target = this.enemyActors.find(a => !a.dead && x >= a.x-a.width/2 && x <= a.x+a.width/2 && y >= a.y-a.height && y <= a.y+20);
        if (target) this.controller?.selectTarget(target.id);
      },
      toggleSound: () => this.audio.toggle(),
      toggleSpeed: () => (this.speed = this.speed === 1 ? 1.5 : this.speed === 1.5 ? 2 : 1),
      toggleMotion: () => this.setMotion(!this.reducedMotion),
    });
    this.renderer = new CanvasRenderer(this.ui.canvas, this.assets);
    this.setMotion(this.reducedMotion);
    this.loop = new GameLoop(delta => this.update(delta), elapsed => this.renderer.render(elapsed));
    this.ui.renderStats(this.todoProgress.level, this.save);
    await this.assets.preload([PLAYER_SPRITE_URL, ARENA_IMAGE_URL]);
    if (this.destroyed) return;
    this.ready = true; this.loop.start();
    await this.prepareStage();
    this.onFocus = () => {
      if (this.controller?.state.status === "playing" || this.controller?.locked) return;
      this.todoProgress = readTodoProgress();
      this.ui.renderStats(this.todoProgress.level, this.save);
      if (!this.controller && !this.loadingStage) this.prepareStage();
    };
    window.addEventListener("focus", this.onFocus);
    window.addEventListener("storage", this.onFocus);
  }
  setMotion(reduced) {
    this.reducedMotion = reduced; this.renderer.reducedMotion = reduced; this.ui.setMotion(reduced);
    if (this.playerActor) this.playerActor.reducedMotion = reduced;
    this.enemyActors.forEach(a => { a.reducedMotion = reduced; });
  }
  createActors() {
    this.playerActor = new Actor({ id: "player", name: "YOU", level: this.todoProgress.level,
      x: PLAYER_HOME.x, y: PLAYER_HOME.y, width: 220, height: 228,
      imageUrl: PLAYER_SPRITE_URL, sprite: PLAYER_SPRITE, fallback: "🧙‍♂️", facing: 1, reducedMotion: this.reducedMotion });
    const count = this.stage.enemies.length;
    const xs = count === 1 ? [735] : count === 2 ? [635, 815] : [555, 715, 865];
    this.enemyActors = this.stage.enemies.map((e,index) => new Actor({
      id: e.id, name: e.name, level: e.level, x: xs[index], y: count === 1 ? 412 : 410 + index * 8,
      width: e.size, height: e.size, imageUrl: e.imageUrl, sprite: e.sprite,
      fallback: e.monster.icon, facing: -1, motion: e.monsterId === "slime" ? "slime" : e.monsterId === "phoenix" ? "flying" : "walker",
      reducedMotion: this.reducedMotion,
    }));
    this.renderer.setScene(this.stage, this.playerActor, this.enemyActors);
  }
  async prepareStage() {
    if (!this.ready || this.destroyed || this.controller?.locked || this.controller?.state.status === "playing") return;
    this.controller?.cancel(); this.controller = null; this.tweens.clear();
    if (!this.storageFailed) this.save = loadGameSave();
    this.todoProgress = readTodoProgress();
    this.stage = getStage(getCurrentStage(this.save));
    const request = ++this.request; this.loadingStage = true;
    this.ui.showCamp(this.stage, this.save, true);
    this.ui.renderStats(this.todoProgress.level, this.save);
    await this.assets.preload(this.stage.enemies.map(e => e.imageUrl));
    if (this.destroyed || request !== this.request) return;
    this.createActors(); this.loadingStage = false;
    this.ui.showCamp(this.stage, this.save, false);
    if (this.stage.enemies.some(e => !this.assets.getImage(e.imageUrl)) || !this.assets.getImage(PLAYER_SPRITE_URL)) {
      this.ui.message("画像を読み込めませんでした。assets/game/ のファイルを確認してください。代替表示で続行できます。");
    }
  }
  startBattle() {
    if (!this.ready || this.loadingStage || this.destroyed || this.controller?.locked || this.controller?.state.status === "playing") return;
    const latest = this.storageFailed ? this.save : loadGameSave();
    if (isCampaignComplete(latest)) { this.prepareStage(); return; }
    if (getCurrentStage(latest) !== this.stage.level) { this.save = latest; this.prepareStage(); return; }
    this.save = latest; this.todoProgress = readTodoProgress();
    this.controller?.cancel(); this.tweens.clear(); this.createActors();
    this.controller = new BattleController({
      stage: this.stage, playerLevel: this.todoProgress.level, playerActor: this.playerActor, enemyActors: this.enemyActors,
      tweens: this.tweens, renderer: this.renderer, audio: this.audio,
      onChange: (state, locked) => this.ui.renderBattle(state, locked),
      onFinish: state => this.finishBattle(state),
    });
    this.ui.renderStats(this.todoProgress.level, this.save);
    this.ui.showBattle(); this.controller.notify();
  }
  async useSkill(id) {
    try { await this.controller?.useSkill(id); }
    catch (error) { console.error("Battle animation failed", error); }
  }
  async finishBattle(result) {
    const commit = () => {
      const applied = applyBattleResult(this.storageFailed ? this.save : loadGameSave(), result);
      this.save = applied.save;
      if (applied.applied) {
        this.storageFailed = !saveGameSave(this.save);
        if (this.storageFailed) this.ui.message("進行を保存できませんでした。この画面では続けられますが、再読み込みすると失われます。");
      }
      this.ui.renderStats(this.todoProgress.level, this.save);
    };
    if (globalThis.navigator?.locks?.request) await navigator.locks.request("rpg-todo:campaign-save", commit);
    else commit();
  }
  update(delta) {
    delta *= this.speed; this.tweens.update(delta);
    this.playerActor?.update(delta); this.enemyActors.forEach(a => a.update(delta)); this.renderer?.update(delta);
  }
  destroy() {
    this.destroyed = true; this.request++; this.controller?.cancel(); this.loop?.stop();
    this.tweens.clear(); this.audio.destroy(); this.ui?.destroy();
    window.removeEventListener("focus", this.onFocus); window.removeEventListener("storage", this.onFocus);
  }
}
