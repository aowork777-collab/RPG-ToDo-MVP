import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readAuthReturn, resolveAuthUser, beginGoogleSignIn, authErrorMessage } from "../src/features/community/auth.mjs";

const page = "https://aowork777-collab.github.io/RPG-ToDo-MVP/hub.html";
function setup(t, suffix = "") {
  const dom = new JSDOM("<main></main>", {url: page + suffix});
  for (const key of ["window", "document", "location", "BroadcastChannel"]) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {value: dom.window[key], configurable: true});
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  t.after(() => dom.window.close());
  return dom.window;
}

test("Provider token exchange errors are distinguished from cancellation and never expose descriptions", () => {
  const callback = readAuthReturn(page + "#error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code%3A+private-test-value");
  assert.match(callback.message, /GOOGLE_TOKEN_EXCHANGE/);
  assert.doesNotMatch(JSON.stringify(callback), /private-test-value|external.code/);
  assert.match(authErrorMessage("server_error"), /AUTH_PROVIDER_ERROR/);
  assert.match(authErrorMessage("access_denied"), /AUTH_CANCELLED/);
});

test("SDK initialization errors cannot silently turn into a logged-out session", async () => {
  let readSession = false;
  await assert.rejects(resolveAuthUser({
    async initialize() {return {error: {code: "bad_code_verifier"}};},
    async getSession() {readSession = true; return {data: {session: null}, error: null};},
  }, {returned: true, hasCode: true}), /AUTH_SESSION_EXPIRED/);
  assert.equal(readSession, false);
});

test("A callback without a stored PKCE verifier gives a retry action instead of silent failure", async () => {
  const auth = {async initialize() {return {error: null};}, async getSession() {return {data: {session: null}, error: null};}};
  await assert.rejects(resolveAuthUser(auth, {returned: true, hasCode: true}), /AUTH_SESSION_EXPIRED/);
  assert.equal(await resolveAuthUser(auth), null);
});

test("Storage-blocked browsers do not leave for Google and existing ToDo data stays untouched", async t => {
  const browserWindow = setup(t); let started = false;
  browserWindow.localStorage.setItem("rpg-todo:v1", "keep-existing-data");
  const auth = {async signInWithOAuth() {started = true; return {error: null};}};
  await assert.rejects(beginGoogleSignIn(auth, page, {get localStorage() {throw Error("blocked");}}), /AUTH_STORAGE/);
  assert.equal(started, false);
  await beginGoogleSignIn(auth, page, browserWindow);
  assert.equal(started, true);
  assert.equal(browserWindow.localStorage.getItem("rpg-todo:v1"), "keep-existing-data");
  assert.equal(browserWindow.localStorage.length, 1);
});

test("Shipped SDK hides provider callback failure from getSession; resolver preserves the actionable failure", async t => {
  const browserWindow = setup(t, "#error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code");
  const {createClient} = await import("../src/vendor/supabase.mjs");
  const client = createClient("https://auth-test.invalid", "test-public-key", {auth: {storageKey: "test-provider", persistSession: false, autoRefreshToken: false, detectSessionInUrl: true, flowType: "pkce"}, global: {fetch: async () => {throw Error("Unexpected network call");}}});
  const init = await client.auth.initialize();
  assert.ok(init.error);
  const session = await client.auth.getSession();
  assert.equal(session.error, null); assert.equal(session.data.session, null);
  await assert.rejects(resolveAuthUser(client.auth, readAuthReturn(browserWindow.location.href)), /GOOGLE_TOKEN_EXCHANGE/);
  client.auth.stopAutoRefresh();
});

test("Shipped SDK exchanges a valid PKCE callback once and resolver returns the authenticated user", async t => {
  setup(t, "?code=test-one-use-code");
  const {createClient} = await import("../src/vendor/supabase.mjs");
  const values = new Map([["test-success-code-verifier", JSON.stringify("test-verifier")]]);
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
  let exchanges = 0;
  const token = [Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url"), Buffer.from(JSON.stringify({sub:"test-user",exp:Math.floor(Date.now()/1000)+3600})).toString("base64url"), "fixture-signature"].join(".");
  const client = createClient("https://auth-test.invalid", "test-public-key", {
    auth: {storageKey: "test-success", storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: true, flowType: "pkce"},
    global: {fetch: async (url, options) => {
      assert.match(String(url), /token\?grant_type=pkce/); exchanges++;
      assert.equal(JSON.parse(options.body).code_verifier, "test-verifier");
      return new Response(JSON.stringify({access_token: token, refresh_token: "test-refresh", expires_in: 3600, token_type: "bearer", user: {id: "test-user", aud: "authenticated"}}), {status: 200, headers: {"Content-Type":"application/json"}});
    }},
  });
  const user = await resolveAuthUser(client.auth, {returned: true, hasCode: true});
  assert.equal(user.id, "test-user"); assert.equal(exchanges, 1);
  assert.equal(new URL(window.location.href).searchParams.has("code"), false);
  assert.equal((await resolveAuthUser(client.auth)).id, "test-user"); assert.equal(exchanges, 1);
  client.auth.stopAutoRefresh();
});
