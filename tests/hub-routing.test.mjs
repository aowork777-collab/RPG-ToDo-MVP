import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { cloud } from "../src/features/community/client.mjs";

test("Hub saves profile, blocks stale writes, and clears private views on logout without blanking other routes", async t => {
  const dom = new JSDOM('<div id="hubNotice" hidden></div><main id="hubRoot"></main>', {url: "https://aowork777-collab.github.io/RPG-ToDo-MVP/hub.html#profile"});
  for (const key of ["window", "document", "FormData", "location", "history", "localStorage", "navigator", "Event"]) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {value: dom.window[key], configurable: true});
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  let user = {id: "test-user", email: "test@example.invalid"}, notify;
  const originals = {getSession: cloud.auth.getSession, onAuthStateChange: cloud.auth.onAuthStateChange, signOut: cloud.auth.signOut, from: cloud.from};
  cloud.auth.getSession = async () => ({data: {session: user ? {user} : null}, error: null});
  cloud.auth.onAuthStateChange = callback => {notify = callback; callback("INITIAL_SESSION", {user}); return {data: {subscription: {unsubscribe() {}}}};};
  cloud.auth.signOut = async () => {user = null; notify("SIGNED_OUT", null); return {error: null};};
  cloud.from = () => {
    const q = {select() {return q;}, order() {return q;}, eq() {return q;}, maybeSingle() {return Promise.resolve({data: null, error: null});}, then(resolve, reject) {return Promise.resolve({data: [], error: null}).then(resolve, reject);}};
    return q;
  };
  t.after(() => {Object.assign(cloud.auth, {getSession: originals.getSession, onAuthStateChange: originals.onAuthStateChange, signOut: originals.signOut}); cloud.from = originals.from; dom.window.close();});
  const waitFor = async predicate => {for (let i = 0; i < 80; i++) {if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 10));} assert.fail("Hub did not reach expected UI state");};
  await import("../src/hub-app.mjs");
  const root = document.getElementById("hubRoot");
  const form = root.querySelector("form"); form.elements.name.value = "テスト冒険者"; form.elements.tags.value = "読書, 読書, 英語";
  form.dispatchEvent(new Event("submit", {cancelable: true}));
  assert.equal(JSON.parse(localStorage.getItem("rpg-todo:v1")).habits.profile.name, "テスト冒険者");
  const saved = JSON.parse(localStorage.getItem("rpg-todo:v1")); saved.totalXp = 300; localStorage.setItem("rpg-todo:v1", JSON.stringify(saved));
  form.elements.name.value = "上書きしない"; form.dispatchEvent(new Event("submit", {cancelable: true}));
  assert.equal(JSON.parse(localStorage.getItem("rpg-todo:v1")).totalXp, 300);
  assert.equal(JSON.parse(localStorage.getItem("rpg-todo:v1")).habits.profile.name, "テスト冒険者");
  assert.match(document.getElementById("hubNotice").textContent, /ほかの画面/);
  location.hash = "community";
  await waitFor(() => root.textContent.includes("招待した人だけの共有ボード"));
  location.hash = "profile";
  await waitFor(() => root.textContent.includes("あなたのプロフィール"));
  user = null; notify("SIGNED_OUT", null);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.match(root.textContent, /あなたのプロフィール/);
  location.hash = "community";
  await waitFor(() => root.textContent.includes("Googleでログイン"));
  user = {id: "test-user", email: "test@example.invalid"}; notify("SIGNED_IN", {user});
  await waitFor(() => root.textContent.includes("共有ボード"));
  [...root.querySelectorAll("button")].find(b => b.textContent === "アカウント・保管").click();
  await waitFor(() => root.textContent.includes("自分専用のクラウド保管"));
  [...root.querySelectorAll("button")].find(b => b.textContent === "ログアウト").click();
  await waitFor(() => root.textContent.includes("Googleでログイン"));
  assert.ok(!root.textContent.includes("test@example.invalid"));
  assert.equal(JSON.parse(localStorage.getItem("rpg-todo:v1")).totalXp, 300);
});
