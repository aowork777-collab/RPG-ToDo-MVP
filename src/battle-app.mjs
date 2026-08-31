import { createGame } from "./game/index.mjs";

let game = null;

async function init() {
  const root = document.getElementById("gameApp");
  if (!root) return;

  try {
    game = createGame(root);
    await game.start();
  } catch (error) {
    console.error(error);
    root.innerHTML = "";
    const message = document.createElement("p");
    message.className = "game-error";
    message.textContent = "ゲームを開始できませんでした。ブラウザのコンソールを確認してください。";
    root.append(message);
  }
}

function destroy() {
  game?.destroy();
  game = null;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

window.addEventListener("pagehide", destroy, { once: true });
