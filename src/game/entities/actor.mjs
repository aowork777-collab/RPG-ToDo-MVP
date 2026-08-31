export class Actor {
  constructor(options) {
    this.id = options.id;
    this.name = options.name;
    this.level = options.level;
    this.x = options.x;
    this.y = options.y;
    this.homeX = options.x;
    this.homeY = options.y;
    this.width = options.width ?? 190;
    this.height = options.height ?? 190;
    this.imageUrl = options.imageUrl ?? null;
    this.fallback = options.fallback ?? "?";
    this.facing = options.facing ?? 1;
    this.state = "idle";
    this.opacity = 1;
    this.scale = 1;
    this.rotation = 0;
    this.hurtTime = 0;
    this.attackTime = 0;
    this.dead = false;
  }

  setState(state) {
    this.state = state;
  }

  hurt() {
    this.state = "hurt";
    this.hurtTime = 0.42;
  }

  attack() {
    this.state = "attack";
    this.attackTime = 0.35;
  }

  update(delta) {
    this.hurtTime = Math.max(0, this.hurtTime - delta);
    this.attackTime = Math.max(0, this.attackTime - delta);

    if (!this.dead && this.hurtTime === 0 && this.attackTime === 0 && this.state !== "run") {
      this.state = "idle";
    }
  }

  getDrawTransform(elapsed) {
    const idleBob = this.dead ? 0 : Math.sin(elapsed * 3.2 + this.level) * 4;
    const hurtShake = this.hurtTime > 0 ? Math.sin(this.hurtTime * 85) * 11 : 0;
    const attackTilt = this.attackTime > 0 ? Math.sin(this.attackTime * 10) * 0.08 : 0;

    return {
      x: this.x + hurtShake,
      y: this.y + idleBob,
      scale: this.scale * (this.hurtTime > 0 ? 0.96 : 1),
      rotation: this.rotation + attackTilt * this.facing,
      opacity: this.opacity,
      flashing: this.hurtTime > 0 && Math.floor(this.hurtTime * 24) % 2 === 0,
    };
  }
}
