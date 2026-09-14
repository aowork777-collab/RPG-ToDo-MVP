import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync,existsSync } from "node:fs";
import vm from "node:vm";
const root=new URL("../",import.meta.url);
function harness(scope="https://example.test/RPG-ToDo-MVP/") {
  const handlers={},stores=new Map(),messages=[];let online=true,writeFails=false;
  const overrides=new Map();
  function key(value){return typeof value==="string"?value:value.url||value.href;}
  function fetchMock(input) {
    if(!online)return Promise.reject(Error("offline"));
    const url=new URL(key(input)),relative=url.pathname.slice(new URL(scope).pathname.length)||"index.html";
    if(overrides.has(url.href))return Promise.resolve(new Response(overrides.get(url.href)));
    const file=new URL(relative,root);
    return Promise.resolve(existsSync(file)?new Response(readFileSync(file)):new Response("missing",{status:404}));
  }
  async function open(name) {
    if(!stores.has(name))stores.set(name,new Map());
    const values=stores.get(name);
    return {
      async match(input){return values.get(key(input))?.clone();},
      async put(input,response){if(writeFails)throw Error("quota");values.set(key(input),response.clone());},
      async addAll(inputs){
        const responses=await Promise.all(inputs.map(fetchMock));
        if(responses.some(r=>!r.ok))throw Error("missing shell resource");
        responses.forEach((response,i)=>values.set(key(inputs[i]),response.clone()));
      }
    };
  }
  const self={registration:{scope},location:new URL("sw.js",scope),clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>{handlers[name]=fn;}};
  const context=vm.createContext({self,URL,Request,Response,Set,Promise,caches:{open,keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name)},fetch:fetchMock});
  context.importScripts=file=>vm.runInContext(readFileSync(new URL(file,root),"utf8"),context);
  vm.runInContext(readFileSync(new URL("sw.js",root),"utf8"),context);
  async function lifecycle(name){let promise;handlers[name]({waitUntil:value=>promise=value});await promise;}
  async function cacheAll(){let promise;handlers.message({data:{type:"CACHE_ALL"},ports:[{postMessage:value=>messages.push(value)}],waitUntil:value=>promise=value});await promise;return messages.at(-1);}
  function request(path){let promise;handlers.fetch({request:new Request(new URL(path,scope)),respondWith:value=>promise=value});return promise;}
  return {lifecycle,cacheAll,request,stores,messages,overrides,setOnline:value=>online=value,setWriteFails:value=>writeFails=value,scope};
}
test("PWA serves task, battle and settings shells offline under a repository subpath",async()=>{
  const h=harness();await h.lifecycle("install");await h.lifecycle("activate");h.setOnline(false);
  for(const path of ["./","index.html","battle.html","settings.html","src/app.mjs?v=updated","manifest.webmanifest"]){
    const response=await h.request(path);assert.ok(response?.ok,path);assert.ok((await response.arrayBuffer()).byteLength>0);
  }
});
test("Offline preparation stores all game art and reports completion only after success",async()=>{
  const h=harness();await h.lifecycle("install");const result=await h.cacheAll();
  assert.equal(result.ok,true);h.setOnline(false);
  for(const path of ["assets/game/player-adventurer-sheet.png","assets/game/player-ultimate-cutin.png","assets/game/enemies/dragon.png"]){
    const response=await h.request(path);assert.equal(response.status,200);assert.ok((await response.arrayBuffer()).byteLength>1000);
  }
});
test("Online updates are fetched fresh; cache write failures do not block the page",async()=>{
  const h=harness();await h.lifecycle("install");h.overrides.set(new URL("index.html",h.scope).href,"new local build");
  assert.equal(await (await h.request("index.html")).text(),"new local build");
  h.setOnline(false);assert.equal(await (await h.request("index.html")).text(),"new local build");
  h.setOnline(true);h.setWriteFails(true);assert.equal(await (await h.request("index.html")).text(),"new local build");
});
test("Worker keeps other applications' caches and ignores unrelated URLs",async()=>{
  const h=harness();h.stores.set("unrelated-cache",new Map());h.stores.set("rpg-todo-app:"+h.scope+":older",new Map());
  await h.lifecycle("install");await h.lifecycle("activate");
  assert.ok(h.stores.has("unrelated-cache"));assert.equal(h.stores.has("rpg-todo-app:"+h.scope+":older"),false);
  assert.equal(h.request("https://other.test/private.json"),undefined);assert.equal(h.request("not-a-static-file.json"),undefined);
});
test("Offline preparation reports failure when a resource cannot be saved",async()=>{
  const h=harness();await h.lifecycle("install");h.setWriteFails(true);
  const result=await h.cacheAll();assert.equal(result.ok,false);assert.equal(result.completed,0);
});
