import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
// Keep modules that resolve artwork relative to import.meta.url at their original
// paths. Bundle the auth graph together so an old cached module cannot mix releases.
await build({
  absWorkingDir: root,
  entryPoints: ["src/hub-app.mjs"],
  outfile: "src/hub-release.mjs",
  bundle: true,
  format: "esm",
  platform: "browser",
  minify: true,
  legalComments: "eof",
  external: ["src/game/data/monsters.mjs", "src/game/config.mjs", "src/features/battle/stages.mjs"].map(file => path.join(root, file)),
});
