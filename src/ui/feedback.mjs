import { setText } from "./helpers.mjs";

export function showToast(elements, title, detail, icon) {
  const toast = document.createElement("div");
  toast.className = "toast";
  const iconElement = document.createElement("span");
  iconElement.className = "toast-icon";
  iconElement.setAttribute("aria-hidden", "true");
  iconElement.textContent = icon;
  const copy = document.createElement("p");
  copy.textContent = title;
  const small = document.createElement("small");
  small.textContent = detail;
  copy.append(small);
  toast.append(iconElement, copy);
  elements.toastStack.append(toast);

  window.setTimeout(() => {
    toast.classList.add("out");
    window.setTimeout(() => toast.remove(), 240);
  }, 2800);
}

export function announce(elements, message) {
  elements.liveRegion.textContent = "";
  window.setTimeout(() => {
    elements.liveRegion.textContent = message;
  }, 10);
}

function createConfetti(elements) {
  const colors = ["#f1cf6a", "#ff6b5e", "#79d6a3", "#8db3ff", "#f4f2ec"];
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 34; index += 1) {
    const piece = document.createElement("i");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 180}px`);
    piece.style.animationDelay = `${Math.random() * 260}ms`;
    fragment.append(piece);
  }
  elements.confettiLayer.replaceChildren(fragment);
  window.setTimeout(() => elements.confettiLayer.replaceChildren(), 2100);
}

export function showLevelUp(elements, level) {
  setText(elements.levelFlashNumber, `LEVEL ${level}`);
  elements.levelFlash.classList.remove("show");
  void elements.levelFlash.offsetWidth;
  elements.levelFlash.classList.add("show");
  createConfetti(elements);
  announce(elements, `レベルアップ。レベル${level}になりました`);
}
