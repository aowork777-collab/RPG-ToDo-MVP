import { ARENA_IMAGE_URL, GAME_HEIGHT, GAME_WIDTH } from "../config.mjs";

function drawContainedImage(context, image, width, height) {
  const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  context.drawImage(image, -drawWidth / 2, -drawHeight, drawWidth, drawHeight);
}

function drawSpriteFrame(context, image, actor) {
  const frame = actor.getSpriteFrame();
  if (!frame) return false;
  const rect = actor.sprite.frames?.[frame.row * frame.columns + frame.column];
  if (rect) {
    const [x, y, w, h] = rect;
    const scale = actor.width / actor.sprite.baseSize;
    context.drawImage(image, x, y, w, h, -w * scale / 2, -h * scale, w * scale, h * scale);
    return true;
  }

  const sourceWidth = image.naturalWidth / frame.columns;
  const sourceHeight = image.naturalHeight / frame.rows;
  const sourceX = frame.column * sourceWidth;
  const sourceY = frame.row * sourceHeight;

  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    -actor.width / 2,
    -actor.height,
    actor.width,
    actor.height,
  );
  context.restore();
  return true;
}

export class CanvasRenderer {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.assets = assets;
    this.stage = null;
    this.player = null;
    this.enemy = null;
    this.effects = [];
    this.shakeTime = 0;
    this.reducedMotion = false;
    this.context.imageSmoothingEnabled = true;
  }

  setScene(stage, player, enemy) {
    this.stage = stage;
    this.player = player;
    this.enemy = enemy;
    this.effects = [];
    this.shakeTime = 0;
  }

  addEffect(type, x, y, text = "") {
    this.effects.push({
      type,
      x,
      y,
      text,
      elapsed: 0,
      duration: type === "victory" ? 2 : type === "damage" ? 0.95 : 0.5,
    });
  }

  shake(duration = 0.25) {
    if (this.reducedMotion) return;
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  addProjectile(type, x, y, targetX, targetY) {
    this.effects.push({ type: "projectile", element: type, x, y, targetX, targetY, elapsed: 0, duration: .32 });
  }

  update(delta) {
    this.shakeTime = Math.max(0, this.shakeTime - delta);
    this.effects.forEach((effect) => {
      effect.elapsed += delta;
    });
    this.effects = this.effects.filter((effect) => effect.elapsed < effect.duration);
  }

  render(elapsed) {
    const context = this.context;
    context.save();
    context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (this.shakeTime > 0) {
      context.translate(
        Math.sin(this.shakeTime * 95) * 7,
        Math.cos(this.shakeTime * 72) * 4,
      );
    }

    this.drawBackground(elapsed);
    if (this.player) this.drawActor(this.player, elapsed, "player");
    if (this.enemy) this.drawActor(this.enemy, elapsed, "enemy");
    this.drawEffects();
    context.restore();
  }

  drawBackground(elapsed) {
    const context = this.context;
    const arena = this.assets.getImage(ARENA_IMAGE_URL);
    if (arena) {
      context.drawImage(arena, 0, 0, GAME_WIDTH, GAME_HEIGHT);
      context.fillStyle = "rgba(4,9,22,0.14)";
      context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      if (!this.reducedMotion) {
        context.save();
        for (let i = 0; i < 22; i += 1) {
          const x = (i * 97 + elapsed * (4 + i % 3)) % GAME_WIDTH;
          const y = 180 + (i * 71) % 290 + Math.sin(elapsed + i) * 12;
          context.globalAlpha = 0.22 + Math.sin(elapsed * 2 + i) * 0.18;
          context.fillStyle = i % 2 ? "#8be5e0" : "#ffd78d";
          context.fillRect(x, y, 2, 2);
        }
        context.restore();
      }
      return;
    }
    const colors = this.stage?.backgroundColors ?? ["#1d2637", "#090b11"];
    const gradient = context.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.65, colors[1]);
    gradient.addColorStop(1, "#06070b");
    context.fillStyle = gradient;
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    context.save();
    context.globalAlpha = 0.15;
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 137 + Math.sin(elapsed * 0.15 + index) * 18) % GAME_WIDTH;
      const y = 50 + ((index * 71) % 250);
      context.fillStyle = index % 2 ? "#ffffff" : "#ffcf70";
      context.beginPath();
      context.arc(x, y, index % 3 === 0 ? 2 : 1, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();

    const ground = context.createLinearGradient(0, 350, 0, GAME_HEIGHT);
    ground.addColorStop(0, "rgba(255,255,255,0.06)");
    ground.addColorStop(1, "rgba(0,0,0,0.62)");
    context.fillStyle = ground;
    context.beginPath();
    context.moveTo(0, 395);
    context.quadraticCurveTo(GAME_WIDTH / 2, 350, GAME_WIDTH, 395);
    context.lineTo(GAME_WIDTH, GAME_HEIGHT);
    context.lineTo(0, GAME_HEIGHT);
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(255,255,255,0.09)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, 396);
    context.quadraticCurveTo(GAME_WIDTH / 2, 351, GAME_WIDTH, 396);
    context.stroke();
  }

  drawActor(actor, elapsed, kind) {
    const context = this.context;
    const transform = actor.getDrawTransform(elapsed);

    context.save();
    context.globalAlpha = Math.max(0, transform.opacity);

    context.fillStyle = "rgba(0,0,0,0.38)";
    context.beginPath();
    context.ellipse(
      transform.x,
      actor.homeY + 16,
      actor.width * 0.36 * transform.scale,
      18 * transform.scale,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();

    context.translate(transform.x, transform.y);
    if (actor.enraged && !actor.dead) {
      const aura = context.createRadialGradient(0, -90, 10, 0, -90, 150);
      aura.addColorStop(0, "rgba(255,78,43,.22)"); aura.addColorStop(1, "rgba(255,78,43,0)");
      context.fillStyle = aura; context.fillRect(-155, -250, 310, 310);
    }
    context.rotate(transform.rotation);
    context.scale(transform.scale * actor.facing * (transform.stretchX ?? 1), transform.scale * (transform.stretchY ?? 1));

    const image = actor.imageUrl ? this.assets.getImage(actor.imageUrl) : null;
    if (image) {
      if (!drawSpriteFrame(context, image, actor)) {
        drawContainedImage(context, image, actor.width, actor.height);
      }
    } else if (kind === "player") {
      this.drawPlayerFallback(context, actor);
    } else {
      context.font = `${Math.floor(actor.height * 0.58)}px system-ui`;
      context.textAlign = "center";
      context.textBaseline = "bottom";
      context.fillText(actor.fallback, 0, 0);
    }

    // Impact particles provide feedback without flashing an opaque rectangle.

    context.restore();

    context.save();
    context.globalAlpha = transform.opacity;
    context.textAlign = "center";
    context.fillStyle = "rgba(255,255,255,0.78)";
    context.font = "700 14px system-ui";
    context.shadowColor = "#000";
    context.shadowBlur = 5;
    context.fillText(`${actor.name} / LV.${actor.level}`, transform.x, actor.homeY + 35);
    context.restore();
  }

  drawPlayerFallback(context, actor) {
    context.font = `${Math.floor(actor.height * 0.62)}px system-ui`;
    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.fillText(actor.fallback || "🧙‍♂️", 0, 0);
  }

  drawEffects() {
    const context = this.context;

    this.effects.forEach((effect) => {
      const progress = Math.min(1, effect.elapsed / effect.duration);
      const alpha = 1 - progress;

      context.save();
      context.globalAlpha = alpha;
      if (effect.type === "projectile") {
        const colors = { fire: "#ffb34f", ice: "#8cecff", shadow: "#c78cff" };
        const p = this.reducedMotion ? 1 : progress;
        const x = effect.x + (effect.targetX - effect.x) * p;
        const y = effect.y + (effect.targetY - effect.y) * p;
        context.strokeStyle = colors[effect.element] || "#fff";
        context.fillStyle = context.strokeStyle; context.shadowColor = context.strokeStyle; context.shadowBlur = 24;
        context.lineWidth = 13; context.lineCap = "round";
        context.beginPath(); context.moveTo(x + (this.reducedMotion ? 0 : 85), y - 8); context.lineTo(x, y); context.stroke();
        context.beginPath(); context.arc(x, y, 15, 0, Math.PI * 2); context.fill();
      }
      if (["impact", "fire", "ice", "shadow"].includes(effect.type)) {
        context.strokeStyle = { impact: "#ffdfaa", fire: "#ffb34f", ice: "#8cecff", shadow: "#c78cff" }[effect.type];
        context.lineWidth = 4; context.beginPath(); context.arc(effect.x, effect.y, 18 + progress * 50, 0, Math.PI * 2); context.stroke();
      }

      if (effect.type === "burst" || effect.type === "charge") {
        const charge = effect.type === "charge";
        const radius = charge ? 65 * (1 - progress) : 15 + progress * 75;
        context.fillStyle = charge ? "#f48a82" : "#ffdfa0";
        for (let i = 0; i < (this.reducedMotion ? 4 : 14); i += 1) {
          const angle = i * 2.399;
          context.fillRect(effect.x + Math.cos(angle) * radius, effect.y + Math.sin(angle) * radius, 4 * (1 - progress) + 1, 4);
        }
      }
      if (effect.type === "victory") {
        context.textAlign = "center";
        context.font = "900 42px system-ui";
        context.fillStyle = "#ffe4a0";
        context.shadowColor = "#080d1a"; context.shadowBlur = 14;
        context.fillText("VICTORY", effect.x, effect.y);
      }

      if (effect.type === "slash") {
        context.strokeStyle = "#fff4bd";
        context.lineWidth = 12 * (1 - progress * 0.55);
        context.lineCap = "round";
        context.shadowColor = "#ff8a5c";
        context.shadowBlur = 24;
        context.beginPath();
        context.arc(effect.x, effect.y - 70, 70 + progress * 30, -1.15, 0.75);
        context.stroke();
      }

      if (effect.type === "heal") {
        context.fillStyle = "#6fffc1";
        context.font = `${32 + progress * 22}px system-ui`;
        context.textAlign = "center";
        context.fillText("✦", effect.x, effect.y - 70 - progress * 80);
        context.fillText("✦", effect.x - 38, effect.y - 25 - progress * 55);
        context.fillText("✦", effect.x + 36, effect.y - 45 - progress * 65);
      }

      if (effect.type === "guard") {
        context.strokeStyle = "#7eb6ff";
        context.lineWidth = 7;
        context.shadowColor = "#6389ff";
        context.shadowBlur = 24;
        context.beginPath();
        context.arc(effect.x, effect.y - 82, 70 + progress * 18, 0, Math.PI * 2);
        context.stroke();
      }

      if (effect.type === "damage") {
        context.fillStyle = effect.text.startsWith("+") ? "#8af2c3" : "#ffffff";
        context.font = "900 28px system-ui";
        context.textAlign = "center";
        context.shadowColor = "#000000";
        context.shadowBlur = 8;
        context.fillText(effect.text, effect.x, effect.y - 155 - progress * 55);
      }

      context.restore();
    });
  }
}
