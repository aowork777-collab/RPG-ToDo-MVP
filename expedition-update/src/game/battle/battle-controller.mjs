import { getSkill } from "../data/skills.mjs";
import { getEnemyIntent } from "./combat-rules.mjs";
import { createBattleState, canUseSkill, selectTarget, selectedEnemy, resolvePlayerAction, resolveEnemyAction, completeTurn, addLog } from "./battle-engine.mjs";

export class BattleController {
  constructor(options) {
    Object.assign(this, options);
    this.state = createBattleState(this.stage, options.playerLevel);
    this.locked = false; this.cancelled = false; this.rewarded = false;
  }
  actor(id) { return id === "player" ? this.playerActor : this.enemyActors.find(a => a.id === id); }
  notify() {
    if (this.cancelled) return;
    for (const enemy of this.state.enemies) {
      const actor = this.actor(enemy.id);
      actor.selected = enemy.id === this.state.selectedTargetId && enemy.hp > 0;
      actor.broken = enemy.broken;
      actor.enraged = enemy.isBoss && enemy.hp / enemy.maxHp <= .4;
    }
    this.onChange?.(this.state, this.locked);
  }
  selectTarget(id) { if (this.locked) return false; const ok = selectTarget(this.state, id); this.notify(); return ok; }
  cancel() { this.cancelled = true; this.locked = true; }
  async pause(seconds) {
    await this.tweens.wait(this.renderer.reducedMotion ? Math.min(.12, seconds) : seconds);
    if (this.cancelled) throw new Error("BATTLE_CANCELLED");
  }
  async move(actor, properties, seconds) {
    await this.tweens.to(actor, properties, this.renderer.reducedMotion ? .001 : seconds, "easeInOut");
    if (this.cancelled) throw new Error("BATTLE_CANCELLED");
  }
  async playEvents(events) {
    for (const event of events) {
      const actor = this.actor(event.id); if (!actor) continue;
      if (event.type === "damage") {
        actor.hurt();
        this.renderer.addEffect("burst", actor.x, actor.y - 80);
        this.renderer.addEffect("damage", actor.x, actor.y, "−" + event.amount);
        this.audio?.play(event.id === "player" ? "hurt" : "attack");
        if (event.broke) {
          this.renderer.addEffect("break", actor.x, actor.y - 100, "WEAKNESS BREAK");
          this.renderer.addEffect("damage", actor.x + 25, actor.y - 45, "−" + event.breakDamage);
        }
        this.renderer.shake(.12);
        if (event.dead) {
          actor.dead = true; actor.setState("dead");
          await this.pause(.48);
          await this.move(actor, { opacity: .16 }, .28);
        }
      } else {
        this.renderer.addEffect(event.type, actor.x, actor.y);
        if (event.amount) this.renderer.addEffect("damage", actor.x, actor.y, "+" + event.amount);
        this.audio?.play(event.type);
      }
    }
    this.notify();
  }
  async useSkill(id) {
    if (this.cancelled || this.locked || !canUseSkill(this.state, id)) return false;
    const skill = getSkill(id);
    this.locked = true; this.state.phase = "animation"; this.notify();
    try {
      const target = selectedEnemy(this.state), actor = this.playerActor;
      if (id === "ultimate") {
        this.renderer.addEffect("ultimate", 480, 230, skill.subtitle);
        this.audio?.play("guard"); actor.setState("victory");
        await this.pause(.9); actor.attack();
      } else if (skill.type === "attack") {
        actor.setState("run");
        await this.move(actor, { x: this.actor(target.id).x - 120 }, .28);
        actor.attack(); await this.pause(.2);
        this.renderer.addEffect("slash", this.actor(target.id).x, this.actor(target.id).y);
      } else {
        actor.setState("guard"); await this.pause(.2);
      }
      const result = resolvePlayerAction(this.state, id);
      await this.playEvents(result.events);
      if (skill.type === "attack" && id !== "ultimate") {
        actor.setState("run"); actor.facing = -1;
        await this.move(actor, { x: actor.homeX }, .28); actor.facing = 1;
      }
      actor.setState("idle");
      if (this.state.status !== "playing") { await this.finish(); return true; }
      if (result.consumesTurn) {
        completeTurn(this.state);
        while (this.state.currentActorId !== "player" && this.state.status === "playing") {
          await this.runEnemyTurn();
          if (this.state.status === "playing") completeTurn(this.state);
        }
      }
      if (this.state.status !== "playing") { await this.finish(); return true; }
      this.state.phase = "player"; this.locked = false; this.notify(); return true;
    } catch (error) {
      if (this.cancelled) return false;
      this.state.status = "error"; this.state.phase = "finished"; this.locked = false;
      addLog(this.state, "演出を中断しました。ステージ進行は保存されていません。再挑戦できます。");
      this.notify(); throw error;
    }
  }
  async runEnemyTurn() {
    const enemy = this.state.enemies.find(e => e.id === this.state.currentActorId);
    const actor = this.actor(enemy.id);
    this.state.phase = "enemy"; this.notify();
    const intent = getEnemyIntent(enemy.actionCount, enemy.attack, enemy.monster, enemy);
    await this.pause(.3);
    if (enemy.broken) {
      const result = resolveEnemyAction(this.state);
      this.renderer.addEffect("break", actor.x, actor.y - 100, "RECOVER");
      await this.pause(.55); this.notify(); return result;
    }
    const attack = intent.type === "attack";
    const ranged = ["fire", "ice", "shadow"].includes(intent.effect);
    if (intent.strong || intent.enraged) {
      actor.setState("charge"); this.renderer.addEffect("charge", actor.x, actor.y - 80);
      await this.pause(.4);
    }
    if (attack && !ranged) {
      actor.setState("run"); await this.move(actor, { x: this.playerActor.x + 135 }, .3);
    }
    actor.setState(attack ? "attack" : "guard");
    if (attack) actor.attack();
    await this.pause(.23);
    if (attack && ranged) {
      this.renderer.addProjectile(intent.effect, actor.x - 40, actor.y - 90, this.playerActor.x, this.playerActor.y - 85);
      await this.pause(.3);
    }
    const result = resolveEnemyAction(this.state);
    await this.playEvents(result.events);
    await this.pause(.2);
    if (attack && !ranged) {
      actor.setState("run"); actor.facing = 1;
      await this.move(actor, { x: actor.homeX }, .3); actor.facing = -1;
    }
    actor.setState("idle"); this.notify();
  }
  async finish() {
    if (this.rewarded || this.cancelled) return;
    this.state.phase = "finished";
    if (this.state.status === "victory") {
      this.playerActor.setState("victory");
      addLog(this.state, "STAGE CLEAR! +" + this.state.goldReward + " GOLD");
      this.renderer.addEffect("victory", 480, 190);
    } else addLog(this.state, "敗北。同じステージから再挑戦できます。");
    this.audio?.play(this.state.status); this.notify();
    await this.pause(.65);
    this.rewarded = true;
    await this.onFinish?.({ ...this.state, monsterIds: this.state.enemies.map(e => e.monsterId) });
    if (this.cancelled) return;
    this.locked = false; this.notify();
  }
}
