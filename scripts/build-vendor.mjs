import { build } from "esbuild";
await build({stdin: {contents: 'export { createClient } from "@supabase/supabase-js";', resolveDir: process.cwd(), sourcefile: "supabase-entry.mjs"}, bundle: true, format: "esm", platform: "browser", minify: true, legalComments: "eof", outfile: "src/vendor/supabase.mjs"});
