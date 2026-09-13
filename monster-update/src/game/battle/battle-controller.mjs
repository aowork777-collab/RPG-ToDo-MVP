import { getSkill } from "../data/skills.mjs";
import { createPlayerState, getEnemyIntent } from "./combat-rules.mjs";

function randomDamage(base) { return Math.max(1, Math.floor(base * (0.9 + Math.random() * 0.2))); }

export class BattleController {
  constructor(options) {
    Object.assign(this, options);
    this.locked = false;
    this.cancelled = false;
    this.rewarded = false;
    this.state = {
      status: "playing", phase: "player", turn: 1,
      player: createPlayerState(options.playerLevel),
      enemy: { name: options.stage.enemyName, level: options.stage.level,
        hp: options.stage.enemyMaxHp, maxHp: options.stage.enemyMaxHp, attack: options.stage.enemyAttack, guarding: false },
      goldReward: options.stage.goldReward,
      intent: getEnemyIntent(1, options.stage.enemyAttack),
      log: [options.stage.enemyName + "が現れた！", options.stage.monster?.description ?? "敵の行動予告を見て戦おう。"],
    };
    this.refreshIntent();
  }
  refreshIntent() {
    this.state.intent = getEnemyIntent(this.state.turn, this.state.enemy.attack, this.stage.monster, this.state.enemy);
    this.enemyActor.enraged = this.state.intent.enraged;
  }
  appendLog(message) { this.state.log.push(message); this.state.log = this.state.log.slice(-60); }
  notify() { if (!this.cancelled) this.onChange?.(this.state, this.locked); }
  cancel() { this.cancelled = true; this.locked = true; }
  async pause(seconds) {
    await this.tweens.wait(seconds);
    if (this.cancelled) throw new Error("BATTLE_CANCELLED");
  }
  async move(actor, properties, seconds) {
    await this.tweens.to(actor, properties, seconds, "easeInOut");
    if (this.cancelled) throw new Error("BATTLE_CANCELLED");
  }
  async useSkill(skillId) {
    if (this.cancelled || this.locked || this.state.status !== "playing") return false;
    const skill = getSkill(skillId);
    if (!skill || this.state.player.mp < skill.mpCost) return false;
    if (skill.type === "heal" && this.state.player.hp >= this.state.player.maxHp) return false;
    this.locked = true;
    this.state.phase = "animation";
    this.state.player.mp -= skill.mpCost;
    this.notify();
    try {
      if (skill.type === "attack") await this.runPlayerAttack(skill);
      else if (skill.type === "guard") await this.runGuard();
      else if (skill.type === "heal") await this.runHeal(skill);
      if (this.state.enemy.hp <= 0) { await this.finish("victory"); return true; }
      await this.runEnemyTurn();
      if (this.state.player.hp <= 0) { await this.finish("defeat"); return true; }
      this.state.turn += 1;
      this.refreshIntent();
      this.state.phase = "player";
      this.locked = false;
      this.notify();
      return true;
    } catch (error) {
      if (this.cancelled) return false;
      this.state.status = "error";
      this.state.phase = "finished";
      this.locked = false;
      this.appendLog("演出を中断しました。戦績は変更されません。もう一度挑戦できます。");
      this.notify();
      throw error;
    }
  }
  async runPlayerAttack(skill) {
    const actor = this.playerActor;
    actor.setState("run");
    await this.move(actor, { x: this.enemyActor.x - 145 }, 0.32);
    actor.attack();
    await this.pause(0.18);
    let damage = randomDamage(this.state.player.attack * skill.power);
    if (this.state.enemy.guarding) {
      damage = Math.max(1, Math.floor(damage * .5));
      this.state.enemy.guarding = false;
      this.appendLog("敵の防御でダメージが半減。防御を崩した！");
    }
    this.state.enemy.hp = Math.max(0, this.state.enemy.hp - damage);
    this.enemyActor.hurt();
    this.audio?.play("attack");
    this.renderer.addEffect("slash", this.enemyActor.x, this.enemyActor.y);
    this.renderer.addEffect("burst", this.enemyActor.x, this.enemyActor.y - 80);
    this.renderer.addEffect("damage", this.enemyActor.x, this.enemyActor.y, "−" + damage);
    this.renderer.shake(skill.id === "power-slash" ? 0.28 : 0.14);
    this.appendLog(skill.name + " → " + damage + "ダメージ");
    this.notify();
    await this.pause(0.23);
    actor.setState("run"); actor.facing = -1;
    await this.move(actor, { x: actor.homeX }, 0.3);
    actor.facing = 1; actor.setState("idle");
  }
  async runGuard() {
    const player = this.state.player;
    player.guarding = true;
    const recovered = Math.min(6, player.maxMp - player.mp);
    player.mp += recovered;
    this.playerActor.setState("guard");
    this.renderer.addEffect("guard", this.playerActor.x, this.playerActor.y);
    this.audio?.play("guard");
    this.appendLog("ガード：次のダメージ半減 / MP +" + recovered);
    this.notify(); await this.pause(0.45);
  }
  async runHeal(skill) {
    const player = this.state.player;
    const amount = Math.min(player.maxHp - player.hp, Math.max(1, Math.floor(player.maxHp * skill.healRate)));
    player.hp += amount;
    this.audio?.play("heal");
    this.renderer.addEffect("heal", this.playerActor.x, this.playerActor.y);
    this.renderer.addEffect("damage", this.playerActor.x, this.playerActor.y, "+" + amount);
    this.appendLog("ヒール → HP +" + amount);
    this.notify(); await this.pause(0.6);
  }
  async runEnemyTurn() {
    this.refreshIntent();
    this.state.phase = "enemy"; this.notify();
    await this.pause(0.3);
    const actor = this.enemyActor;
    const intent = this.state.intent;
    const player = this.state.player;
    const enemy = this.state.enemy;
    if (intent.type === "heal" || intent.type === "guard") {
      actor.setState("charge");
      await this.pause(0.35);
      if (intent.type === "heal") {
        const amount = Math.min(enemy.maxHp - enemy.hp, Math.floor(enemy.maxHp * .12));
        enemy.hp += amount;
        this.renderer.addEffect("heal", actor.x, actor.y);
        this.renderer.addEffect("damage", actor.x, actor.y, "+" + amount);
        this.appendLog(actor.name + "の" + intent.name + " → HP +" + amount);
        this.audio?.play("heal");
      } else {
        enemy.guarding = true;
        this.renderer.addEffect("guard", actor.x, actor.y);
        this.appendLog(actor.name + "は" + intent.name + "！ 次の被ダメージを半減");
        this.audio?.play("guard");
      }
      player.mp = Math.min(player.maxMp, player.mp + 2);
      this.notify(); await this.pause(.5); actor.setState("idle");
      return;
    }
    if (intent.strong || intent.enraged) {
      actor.setState("charge");
      this.renderer.addEffect("charge", actor.x, actor.y - 75);
      await this.pause(0.45);
    }
    const ranged = ["fire", "ice", "shadow"].includes(intent.effect);
    if (!ranged) {
      actor.setState("run");
      await this.move(actor, { x: this.playerActor.x + 145 }, .36);
    }
    const guarded = player.guarding;
    player.guarding = false;
    if (guarded) this.appendLog("ガード成功！ この連続攻撃のダメージを半減");
    for (let hit = 0; hit < intent.hits; hit++) {
      if (player.hp <= 0) break;
      actor.attack();
      await this.pause(.23);
      if (ranged) {
        this.renderer.addProjectile(intent.effect, actor.x - 45, actor.y - 95, this.playerActor.x, this.playerActor.y - 85);
        await this.pause(.3);
      }
      let damage = randomDamage(enemy.attack * intent.multiplier);
      if (guarded) {
        damage = Math.max(1, Math.floor(damage * .5));
        this.renderer.addEffect("guard", this.playerActor.x, this.playerActor.y);
      }
      const lostHp = Math.min(player.hp, damage);
      player.hp = Math.max(0, player.hp - damage);
      this.playerActor.hurt(); this.audio?.play("hurt");
      this.renderer.addEffect("burst", this.playerActor.x, this.playerActor.y - 80);
      this.renderer.addEffect("damage", this.playerActor.x, this.playerActor.y, "−" + damage);
      this.renderer.shake(intent.strong ? .22 : .12);
      this.appendLog(actor.name + "の" + intent.name + (intent.hits > 1 ? " " + (hit + 1) + "/" + intent.hits : "") + " → " + damage + "ダメージ");
      if (intent.drain) {
        const recovered = Math.min(enemy.maxHp - enemy.hp, Math.floor(lostHp * intent.drain));
        enemy.hp += recovered;
        this.renderer.addEffect("heal", actor.x, actor.y);
        this.appendLog("生命を吸収 → 敵のHP +" + recovered);
      }
      this.notify(); await this.pause(.26);
    }
    if (player.hp > 0) player.mp = Math.min(player.maxMp, player.mp + 2);
    if (!ranged) {
      actor.setState("run"); actor.facing = 1;
      await this.move(actor, { x: actor.homeX }, .34);
      actor.facing = -1;
    }
    actor.setState("idle"); this.notify();
  }
  async finish(status) {
    if (this.rewarded || this.cancelled) return;
    this.state.status = status; this.state.phase = "finished";
    const fallen = status === "victory" ? this.enemyActor : this.playerActor;
    fallen.dead = true; fallen.setState("dead");
    if (status === "victory") this.playerActor.setState("victory");
    this.appendLog(status === "victory" ? "勝利！ +" + this.state.goldReward + " GOLD" : "敗北。GOLD・ToDoのXPは減りません。");
    this.audio?.play(status);
    this.notify();
    await this.pause(0.52);
    await this.move(fallen, { opacity: 0.12 }, 0.55);
    if (status === "victory") this.renderer.addEffect("victory", 480, 190);
    this.rewarded = true;
    this.onFinish?.(this.state);
    this.locked = false;
    this.notify();
  }
}
