import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
// Ship the task state, actions and UI together so cached older modules cannot
// discard newly introduced schedule/review fields during a release transition.
await build({absWorkingDir:root,entryPoints:["src/app.mjs"],outfile:"src/todo-release.mjs",bundle:true,format:"esm",platform:"browser",minify:true,legalComments:"eof",
  external:["src/game/data/monsters.mjs","src/game/config.mjs","src/features/battle/stages.mjs"].map(file=>path.join(root,file))});
