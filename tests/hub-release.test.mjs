import test from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";

test("Published hub bundle handles provider failure and remains usable without loading stale auth modules", async t => {
  const dom = new JSDOM('<div id="hubNotice" hidden></div><main id="hubRoot"></main>', {url:"https://aowork777-collab.github.io/RPG-ToDo-MVP/hub.html#error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code"});
  for (const key of ["window","document","location","history","navigator","localStorage","Event","FormData","BroadcastChannel"]) {
    const previous = Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
    t.after(()=>previous ? Object.defineProperty(globalThis,key,previous) : delete globalThis[key]);
  }
  t.after(()=>dom.window.close());
  const waitFor=async predicate=>{for(let i=0;i<80;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));} assert.fail("Expected release UI did not appear");};
  await import("../src/hub-release.mjs");
  await waitFor(()=>document.getElementById("hubNotice").textContent.includes("GOOGLE_TOKEN_EXCHANGE"));
  assert.equal(location.hash,"#community");
  assert.ok([...document.querySelectorAll("button")].some(b=>b.textContent==="Googleでログイン"&&!b.disabled));
  location.hash="profile";
  await waitFor(()=>document.querySelector('input[name="name"]'));
  const form=document.querySelector('input[name="name"]').form;
  form.elements.name.value="リリース確認";
  form.dispatchEvent(new Event("submit",{cancelable:true}));
  assert.equal(JSON.parse(localStorage.getItem("rpg-todo:v1")).habits.profile.name,"リリース確認");
  assert.equal(JSON.parse(localStorage.getItem("rpg-todo:v1")).totalXp,0);
});
