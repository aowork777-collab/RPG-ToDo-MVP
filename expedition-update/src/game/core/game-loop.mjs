export class GameLoop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.running = false;
    this.frameId = 0;
    this.previousTime = 0;
    this.elapsed = 0;
    this.tick = this.tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.previousTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  tick(now) {
    if (!this.running) return;

    const delta = Math.min(0.05, Math.max(0, (now - this.previousTime) / 1000));
    this.previousTime = now;
    this.elapsed += delta;

    this.update(delta, this.elapsed);
    this.render(this.elapsed);
    this.frameId = requestAnimationFrame(this.tick);
  }
}
