import { PLAYER_STATS } from "../config.mjs";
import { getSkill } from "../data/skills.mjs";

function randomDamage(baseDamage) {
  const rate = 0.9 + Math.random() * 0.2;
  return Math.max(1, Math.floor(baseDamage * rate));
}

function createPlayerState(playerLevel) {
  const level = Math.max(1, Math.floor(Number(playerLevel) || 1));
  const maxHp = PLAYER_STATS.baseHp + level * PLAYER_STATS.hpPerLevel;
  const maxMp = PLAYER_STATS.baseMp + level * PLAYER_STATS.mpPerLevel;

  return {
    name: "YOU",
    level,
    hp: maxHp,
    maxHp,
    mp: maxMp,
    maxMp,
    attack: PLAYER_STATS.baseAttack + level * PLAYER_STATS.attackPerLevel,
    guarding: false,
  };
}

function createEnemyState(stage) {
  return {
    name: stage.enemyName,
    level: stage.level,
    hp: stage.enemyMaxHp,
    maxHp: stage.enemyMaxHp,
    attack: stage.enemyAttack,
  };
}

export class BattleController {
  constructor(options) {
    this.stage = options.stage;
    this.playerActor = options.playerActor;
    this.enemyActor = options.enemyActor;
    this.tweens = options.tweens;
    this.renderer = options.renderer;
    this.onChange = options.onChange;
    this.onFinish = options.onFinish;
    this.locked = false;

    this.state = {
      status: "playing",
      phase: "player",
      turn: 1,
      player: createPlayerState(options.playerLevel),
      enemy: createEnemyState(options.stage),
      goldReward: options.stage.goldReward,
      log: [
        `BATTLE LEVEL ${options.stage.level} START!`,
        `${options.stage.enemyName}が現れた!`,
      ],
    };
  }

  appendLog(message) {
    this.state.log.push(message);
    this.state.log = this.state.log.slice(-60);
  }

  notify() {
    this.onChange?.(this.state, this.locked);
  }

  async useSkill(skillId) {
    if (this.locked || this.state.status !== "playing") return false;

    const skill = getSkill(skillId);
    if (!skill) return false;

    if (this.state.player.mp < skill.mpCost) {
      this.appendLog(`${skill.name}: MPが足りません`);
      this.notify();
      return false;
    }

    this.locked = true;
    this.state.phase = "animation";
    this.state.player.mp -= skill.mpCost;
    this.notify();

    if (skill.type === "attack") {
      await this.runPlayerAttack(skill);
    } else if (skill.type === "guard") {
      await this.runGuard(skill);
    } else if (skill.type === "heal") {
      await this.runHeal(skill);
    }

    if (this.state.enemy.hp <= 0) {
      await this.finishVictory();
      return true;
    }

    await this.runEnemyTurn();

    if (this.state.player.hp <= 0) {
      await this.finishDefeat();
      return true;
    }

    this.state.turn += 1;
    this.state.phase = "player";
    this.locked = false;
    this.notify();
    return true;
  }

  async runPlayerAttack(skill) {
    const actor = this.playerActor;
    actor.setState("run");

    await this.tweens.to(
      actor,
      { x: this.enemyActor.x - 165 },
      0.34,
      "easeInOut",
    );

    actor.attack();
    await this.tweens.wait(0.11);

    const damage = randomDamage(this.state.player.attack * skill.power);
    this.state.enemy.hp = Math.max(0, this.state.enemy.hp - damage);
    this.enemyActor.hurt();
    this.renderer.addEffect("slash", this.enemyActor.x, this.enemyActor.y);
    this.renderer.addEffect("damage", this.enemyActor.x, this.enemyActor.y, `-${damage}`);
    this.renderer.shake(skill.id === "power-slash" ? 0.34 : 0.22);
    this.appendLog(`${skill.icon} ${skill.name}! ${damage}ダメージ`);
    this.notify();

    await this.tweens.wait(0.34);
    actor.setState("run");
    await this.tweens.to(actor, { x: actor.homeX }, 0.32, "easeInOut");
    actor.setState("idle");
  }

  async runGuard(skill) {
    this.state.player.guarding = true;
    this.renderer.addEffect("guard", this.playerActor.x, this.playerActor.y);
    this.appendLog(`${skill.icon} ガードの構え!`);
    this.notify();
    await this.tweens.wait(0.45);
  }

  async runHeal(skill) {
    const amount = Math.max(1, Math.floor(this.state.player.maxHp * skill.healRate));
    const previousHp = this.state.player.hp;
    this.state.player.hp = Math.min(this.state.player.maxHp, previousHp + amount);
    const actualHeal = this.state.player.hp - previousHp;
    this.renderer.addEffect("heal", this.playerActor.x, this.playerActor.y);
    this.renderer.addEffect("damage", this.playerActor.x, this.playerActor.y, `+${actualHeal}`);
    this.appendLog(`${skill.icon} ${actualHeal} HP回復!`);
    this.notify();
    await this.tweens.wait(0.65);
  }

  async runEnemyTurn() {
    const actor = this.enemyActor;
    await this.tweens.wait(0.38);
    actor.setState("run");

    await this.tweens.to(
      actor,
      { x: this.playerActor.x + 165 },
      0.38,
      "easeInOut",
    );

    actor.attack();
    await this.tweens.wait(0.12);

    const powerful = Math.random() < 0.15;
    let damage = randomDamage(this.state.enemy.attack * (powerful ? 1.4 : 1));

    if (this.state.player.guarding) {
      damage = Math.max(1, Math.floor(damage * 0.5));
      this.state.player.guarding = false;
      this.appendLog(`GUARD! ダメージを${damage}に軽減`);
      this.renderer.addEffect("guard", this.playerActor.x, this.playerActor.y);
    }

    this.state.player.hp = Math.max(0, this.state.player.hp - damage);
    this.playerActor.hurt();
    this.renderer.addEffect("slash", this.playerActor.x, this.playerActor.y);
    this.renderer.addEffect("damage", this.playerActor.x, this.playerActor.y, `-${damage}`);
    this.renderer.shake(powerful ? 0.36 : 0.24);
    this.appendLog(
      powerful
        ? `${this.state.enemy.name}の強攻撃! ${damage}ダメージ`
        : `${this.state.enemy.name}の攻撃! ${damage}ダメージ`,
    );

    if (this.state.player.hp > 0) {
      this.state.player.mp = Math.min(
        this.state.player.maxMp,
        this.state.player.mp + 2,
      );
    }

    this.notify();
    await this.tweens.wait(0.34);
    actor.setState("run");
    await this.tweens.to(actor, { x: actor.homeX }, 0.36, "easeInOut");
    actor.setState("idle");
  }

  async finishVictory() {
    this.state.status = "victory";
    this.state.phase = "finished";
    this.enemyActor.dead = true;
    this.enemyActor.setState("dead");
    this.playerActor.setState("victory");
    this.appendLog(`VICTORY! +${this.state.goldReward} GOLD`);
    this.notify();

    await Promise.all([
      this.tweens.to(this.enemyActor, { opacity: 0, y: this.enemyActor.y + 60 }, 0.75),
      this.tweens.to(this.enemyActor, { rotation: -0.22 }, 0.6),
    ]);

    this.locked = false;
    this.notify();
    this.onFinish?.(this.state);
  }

  async finishDefeat() {
    this.state.status = "defeat";
    this.state.phase = "finished";
    this.playerActor.dead = true;
    this.playerActor.setState("dead");
    this.appendLog("DEFEAT... GOLDは失いません");
    this.notify();

    await Promise.all([
      this.tweens.to(this.playerActor, { opacity: 0.28, y: this.playerActor.y + 55 }, 0.75),
      this.tweens.to(this.playerActor, { rotation: 0.28 }, 0.6),
    ]);

    this.locked = false;
    this.notify();
    this.onFinish?.(this.state);
  }
}
