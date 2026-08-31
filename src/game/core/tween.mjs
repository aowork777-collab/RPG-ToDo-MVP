const EASING = Object.freeze({
  linear: (value) => value,
  easeOut: (value) => 1 - (1 - value) ** 3,
  easeInOut: (value) =>
    value < 0.5
      ? 4 * value ** 3
      : 1 - (-2 * value + 2) ** 3 / 2,
});

export class TweenManager {
  constructor() {
    this.items = [];
  }

  to(target, properties, duration = 0.3, easing = "easeOut") {
    const seconds = Math.max(0.001, Number(duration) || 0.001);
    const starts = {};

    Object.keys(properties).forEach((key) => {
      starts[key] = Number(target[key]) || 0;
    });

    return new Promise((resolve) => {
      this.items.push({
        target,
        properties,
        starts,
        duration: seconds,
        elapsed: 0,
        easing: EASING[easing] ?? EASING.easeOut,
        resolve,
      });
    });
  }

  wait(duration) {
    return this.to({}, {}, duration, "linear");
  }

  update(delta) {
    const finished = [];

    this.items.forEach((item) => {
      item.elapsed += delta;
      const progress = Math.min(1, item.elapsed / item.duration);
      const eased = item.easing(progress);

      Object.entries(item.properties).forEach(([key, endValue]) => {
        item.target[key] = item.starts[key] + (endValue - item.starts[key]) * eased;
      });

      if (progress >= 1) finished.push(item);
    });

    if (!finished.length) return;
    this.items = this.items.filter((item) => !finished.includes(item));
    finished.forEach((item) => item.resolve());
  }

  clear() {
    const items = this.items.splice(0);
    items.forEach((item) => item.resolve());
  }
}
