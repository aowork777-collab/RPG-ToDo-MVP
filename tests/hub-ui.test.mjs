import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createDefaultState } from "../src/model.mjs";
import { addTask } from "../src/actions.mjs";
import { dateKey } from "../src/features/habits/state.mjs";
import { renderCalendar } from "../src/features/habits/calendar.mjs";
import { openSmallStep } from "../src/features/habits/today.mjs";
import { button } from "../src/features/habits/dom.mjs";
import { googleSignInOptions, readAuthReturn, cleanAuthReturn } from "../src/features/community/auth.mjs";
import { renderSignIn } from "../src/features/community/account.mjs";

const url = "https://aowork777-collab.github.io/RPG-ToDo-MVP/hub.html";
function setup(t, href = url) {
  const dom = new JSDOM('<div id="hubNotice" hidden></div><main id="root"></main>', {url: href});
  for (const key of ["window", "document", "FormData", "location"]) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {value: dom.window[key], configurable: true});
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  dom.window.HTMLDialogElement.prototype.showModal = function () {this.open = true;};
  dom.window.HTMLDialogElement.prototype.close = function () {this.open = false; this.dispatchEvent(new dom.window.Event("close"));};
  t.after(() => dom.window.close());
  return {dom, root: dom.window.document.getElementById("root")};
}
const submit = form => form.dispatchEvent(new window.Event("submit", {bubbles: true, cancelable: true}));
const settle = () => new Promise(resolve => setTimeout(resolve, 10));

test("Google login keeps the repository path and ignores untrusted next redirects", () => {
  assert.deepEqual(googleSignInOptions(`${url}?next=https://evil.invalid/#records`), {
    provider: "google", options: {redirectTo: url, queryParams: {prompt: "select_account"}},
  });
  assert.equal(googleSignInOptions("http://localhost:8092/hub.html#community").options.redirectTo, "http://localhost:8092/hub.html");
});
test("OAuth callbacks and cancellations are detected without reflecting provider input", t => {
  const {dom} = setup(t, `${url}?code=example-code&next=unsafe#access_token=example-token`);
  assert.equal(readAuthReturn(dom.window.location.href).returned, true);
  assert.equal(readAuthReturn(`${url}#records`).returned, false);
  const failure = readAuthReturn(`${url}#error=access_denied&error_description=<script>`);
  assert.ok(failure.message.includes("キャンセル")); assert.ok(!failure.message.includes("<script>"));
  cleanAuthReturn(dom.window.location.href, dom.window.history);
  assert.equal(dom.window.location.href, `${url}#community`);
});
test("Google button invokes only OAuth; network failure restores retry and shows feedback", async t => {
  const {root} = setup(t); let received;
  renderSignIn(root, () => {}, {async signInWithOAuth(options) {received = options; return {data: null, error: {message: "テスト接続エラー"}};}});
  assert.equal(root.querySelectorAll('input[type="password"], input[type="email"]').length, 0);
  const login = root.querySelector("button"); assert.equal(login.textContent, "Googleでログイン");
  login.click(); assert.equal(login.disabled, true); await settle();
  assert.deepEqual(received, googleSignInOptions(url)); assert.equal(login.disabled, false);
  assert.match(document.getElementById("hubNotice").textContent, /テスト接続エラー/);
});
test("Calendar saves rest, mood and private note without granting XP", t => {
  const {root} = setup(t); const state = createDefaultState(); let commits = 0;
  renderCalendar(root, state, () => {commits++; return true;});
  const form = root.querySelector('input[name="rest"]').form;
  form.elements.rest.checked = true; form.elements.mood.value = "tired"; form.elements.note.value = "今日は休養"; submit(form);
  assert.equal(commits, 1); assert.equal(state.totalXp, 0);
  assert.deepEqual(state.habits.days[dateKey()], {rest: true, mood: "tired", note: "今日は休養"});
  assert.match(root.querySelector('[aria-pressed="true"]').getAttribute("aria-label"), /休む日/);
});
test("Failed calendar save rolls back draft instead of creating a phantom achievement", t => {
  const {root} = setup(t); const state = createDefaultState();
  renderCalendar(root, state, () => false);
  const form = root.querySelector('input[name="rest"]').form; form.elements.rest.checked = true; submit(form);
  assert.equal(state.habits.days[dateKey()], undefined);
});
test("Calendar shows hostile task titles as text, never markup", t => {
  const {root} = setup(t); const state = createDefaultState();
  state.habits.completions.a = {id: "a", title: '<img src=x onerror="alert(1)">', date: dateKey(), xp: 10};
  renderCalendar(root, state, () => true);
  assert.equal(root.querySelectorAll("img,script").length, 0); assert.match(root.textContent, /<img/);
});
test("Small step changes only today's task and awards no XP until completed", t => {
  setup(t); const state = createDefaultState(); const task = addTask(state, {title: "本を1冊読む", difficulty: 5});
  state.daily.templates.push({id: "daily", title: task.title}); task.dailyTemplateId = "daily";
  openSmallStep(state, task.id, () => true);
  const form = document.querySelector("dialog form"); form.elements.title.value = "1ページ読む"; submit(form);
  assert.equal(document.querySelector("dialog"), null); assert.equal(task.title, "1ページ読む");
  assert.equal(task.originalTitle, "本を1冊読む"); assert.equal(task.reward, 10);
  assert.equal(state.daily.templates[0].title, "本を1冊読む"); assert.equal(state.totalXp, 0);
});
test("Small-step save failure keeps dialog open and restores original task", t => {
  setup(t); const state = createDefaultState(); const task = addTask(state, {title: "運動", difficulty: 3});
  openSmallStep(state, task.id, () => false);
  const form = document.querySelector("dialog form"); form.elements.title.value = "ストレッチ"; submit(form);
  assert.equal(document.querySelector("dialog").open, true); assert.equal(task.title, "運動"); assert.equal(task.difficulty, 3);
});
test("Async refresh errors produce visible feedback rather than unhandled rejection", async t => {
  const {root} = setup(t); root.append(button("更新", async () => {throw Error("更新できませんでした");}));
  root.querySelector("button").click(); await settle();
  assert.equal(document.getElementById("hubNotice").hidden, false);
  assert.equal(document.getElementById("hubNotice").textContent, "更新できませんでした");
});
