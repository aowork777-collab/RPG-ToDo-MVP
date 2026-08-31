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
    this.sprite = options.sprite ?? null;
    this.fallback = options.fallback ?? "?";
    this.facing = options.facing ?? 1;
    this.state = "idle";
    this.opacity = 1;
    this.scale = 1;
    this.rotation = 0;
    this.hurtTime = 0;
    this.attackTime = 0;
    this.stateElapsed = 0;
    this.dead = false;
  }

  setState(state) {
    if (this.state === state) return;
    this.state = state;
    this.stateElapsed = 0;
  }

  hurt() {
    this.setState("hurt");
    this.hurtTime = 0.42;
  }

  attack() {
    this.setState("attack");
    this.attackTime = 0.35;
  }

  update(delta) {
    this.stateElapsed += delta;
    this.hurtTime = Math.max(0, this.hurtTime - delta);
    this.attackTime = Math.max(0, this.attackTime - delta);

    if (!this.dead && this.state === "hurt" && this.hurtTime === 0) {
      this.setState("idle");
    }

    if (!this.dead && this.state === "attack" && this.attackTime === 0) {
      this.setState("idle");
    }
  }

  getSpriteFrame() {
    if (!this.sprite) return null;

    const animation =
      this.sprite.animations[this.state] ??
      this.sprite.animations.idle;

    const elapsedFrame = Math.floor(this.stateElapsed * animation.fps);
    const frameOffset = animation.loop
      ? elapsedFrame % animation.frames
      : Math.min(animation.frames - 1, elapsedFrame);

    return {
      column: animation.startFrame + frameOffset,
      row: animation.row,
      columns: this.sprite.columns,
      rows: this.sprite.rows,
    };
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
