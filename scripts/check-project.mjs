import { readFileSync,existsSync,readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root=fileURLToPath(new URL("../",import.meta.url));
const missing=[];
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const files=walk(path.join(root,"src"));
for(const file of files.filter(file=>file.endsWith(".mjs"))){
  const code=readFileSync(file,"utf8");
  const imports=[...code.matchAll(/(?:from\s+|import\s*)["'](\.[^"']+)["']/g)].map(match=>match[1]);
  for(const name of imports)if(!existsSync(path.resolve(path.dirname(file),name)))missing.push(path.relative(root,file)+" -> "+name);
}
for(const file of ["index.html","battle.html","hub.html","settings.html"]){
  const html=readFileSync(path.join(root,file),"utf8");
  for(const match of html.matchAll(/(?:src|href)=["'](\.\/[^"'?#]+)(?:[^"']*)["']/g)){
    if(!existsSync(path.resolve(root,match[1])))missing.push(file+" -> "+match[1]);
  }
  const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]);
  if(new Set(ids).size!==ids.length)missing.push(file+" has duplicate IDs");
}
const manifest=JSON.parse(readFileSync(path.join(root,"manifest.webmanifest"),"utf8"));
for(const icon of manifest.icons)if(!existsSync(path.resolve(root,icon.src)))missing.push(icon.src);
if(missing.length){console.error(missing.join("\n"));process.exitCode=1;}else console.log("ページ・モジュール・PWAアイコンの参照はすべて揃っています。");
