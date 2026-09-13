export { Game } from "./Game.mjs";

import { Game } from "./Game.mjs";

export function createGame(root) {
  return new Game(root);
}
