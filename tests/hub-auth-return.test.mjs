import test from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {cloud} from "../src/features/community/client.mjs";

test("Failed OAuth return shows a usable sign-in screen, cleans its URL and does not replay errors on navigation", async t => {
  const dom = new JSDOM('<div id="hubNotice" hidden></div><main id="hubRoot"></main>', {url: "https://aowork777-collab.github.io/RPG-ToDo-MVP/hub.html#error=server_error&error_description=Unable+to+exchange+external+code"});
  for (const key of ["window", "document", "FormData", "location", "history", "localStorage", "navigator", "Event"]) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {value: dom.window[key], configurable: true});
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  const originals = {initialize: cloud.auth.initialize, getSession: cloud.auth.getSession, onAuthStateChange: cloud.auth.onAuthStateChange};
  let initialized = 0;
  cloud.auth.initialize = async () => {initialized++; return {error: {code: "unexpected_failure"}};};
  cloud.auth.getSession = async () => ({data: {session: null}, error: null});
  cloud.auth.onAuthStateChange = callback => {callback("INITIAL_SESSION", null); return {data: {subscription: {unsubscribe() {}}}};};
  t.after(() => {Object.assign(cloud.auth, originals); dom.window.close();});
  const waitFor = async predicate => {for(let i=0; i<80; i++) {if(predicate()) return; await new Promise(r=>setTimeout(r,10));} assert.fail("Expected auth UI did not appear");};
  await import("../src/hub-app.mjs");
  const root = document.getElementById("hubRoot"), notice = document.getElementById("hubNotice");
  await waitFor(() => root.textContent.includes("Googleでログイン"));
  assert.equal(initialized, 1); assert.match(notice.textContent, /GOOGLE_TOKEN_EXCHANGE/);
  assert.equal(location.search, ""); assert.equal(location.hash, "#community");
  location.hash = "profile";
  await waitFor(() => root.querySelector("form"));
  location.hash = "community";
  await waitFor(() => root.textContent.includes("Googleでログイン"));
  assert.equal(notice.hidden, true); assert.equal(initialized, 1);
});
