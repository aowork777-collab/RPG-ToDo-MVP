import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createDefaultState, normalizeState } from '../src/model.mjs';
import { normalizePhoto, prepareProfilePhoto, MAX_PHOTO_LENGTH, renderAvatar } from '../src/features/habits/photo.mjs';
import { renderProfileEditor } from '../src/features/habits/profile.mjs';
import { createBackup, restoreBackup } from '../src/features/backup/backup.mjs';

const photo = 'data:image/jpeg;base64,/9j/TEST';
function setup(t) {
  const dom = new JSDOM('<div id="hubNotice"></div><main></main>');
  for (const key of ['document', 'window', 'FormData']) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {value: dom.window[key], configurable: true});
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  t.after(() => dom.window.close());
  return document.querySelector('main');
}
const submit = form => form.dispatchEvent(new window.Event('submit', {cancelable: true}));
function choose(root, file = {type: 'image/jpeg'}) {
  const input = root.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', {value: [file], configurable: true});
  input.dispatchEvent(new window.Event('change'));
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

test('Photo normalization rejects remote URLs, markup, and oversized data; backup retains photo and XP', () => {
  for (const invalid of ['https://example.com/avatar.jpg', 'data:image/svg+xml,<svg/>', 'javascript:alert(1)', photo + 'x'.repeat(MAX_PHOTO_LENGTH), {}, undefined]) assert.equal(normalizePhoto(invalid), null);
  const state = normalizeState({totalXp: 1250, habits: {profile: {name: '名前', avatar: '🌱', photo}}});
  assert.equal(state.habits.profile.photo, photo); assert.equal(state.habits.profile.avatar, 'user');
  const map = new Map([['rpg-todo:v1', JSON.stringify(state)]]);
  const storage = {getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key)};
  const backup = createBackup(storage); map.delete('rpg-todo:v1'); restoreBackup(backup, storage);
  const restored = JSON.parse(map.get('rpg-todo:v1'));
  assert.equal(restored.habits.profile.photo, photo); assert.equal(restored.totalXp, 1250);
});
test('Unsupported and oversize files fail before any decoding', async () => {
  await assert.rejects(prepareProfilePhoto({type: 'image/svg+xml', size: 1}), /JPEG/);
  await assert.rejects(prepareProfilePhoto({type: 'image/jpeg', size: 11 * 1024 * 1024}), /10MB/);
});
test('A photo is a draft until saved; removal persists without changing XP', async t => {
  const root = setup(t), state = createDefaultState(); state.totalXp = 640; let commits = 0;
  renderProfileEditor(root, state, () => {commits++; return true;}, async () => photo);
  choose(root); assert.equal(root.querySelector('[type="submit"]').disabled, true);
  submit(root.querySelector('form')); assert.equal(commits, 0);
  await settle(); assert.equal(state.habits.profile.photo, null); assert.equal(root.querySelector('img').getAttribute('src'), photo);
  submit(root.querySelector('form')); assert.equal(state.habits.profile.photo, photo); assert.equal(commits, 1);
  [...root.querySelectorAll('button')].find(b => b.textContent === '写真を削除').click();
  assert.equal(state.habits.profile.photo, photo); submit(root.querySelector('form'));
  assert.equal(state.habits.profile.photo, null); assert.equal(state.totalXp, 640);
});
test('Failed profile save restores previous photo, name and weekly goal', async t => {
  const root = setup(t), state = createDefaultState(), previous = structuredClone(state.habits);
  renderProfileEditor(root, state, () => false, async () => photo);
  choose(root); await settle();
  const form = root.querySelector('form'); form.elements.name.value = '変更'; form.elements.weeklyGoal.value = '7'; submit(form);
  assert.deepEqual(state.habits, previous);
});
test('Latest selected photo wins; failed decode keeps previous draft usable', async t => {
  const root = setup(t), state = createDefaultState(), pending = [];
  renderProfileEditor(root, state, () => true, () => new Promise((resolve, reject) => pending.push({resolve, reject})));
  choose(root); choose(root); pending[1].resolve(photo); await settle(); pending[0].resolve(photo + 'OLD'); await settle();
  submit(root.querySelector('form')); assert.equal(state.habits.profile.photo, photo);
  choose(root); pending[2].reject(Error('読み込み失敗')); await settle();
  assert.match(root.querySelector('[role="status"]').textContent, /読み込み失敗/);
  assert.equal(root.querySelector('[type="submit"]').disabled, false);
  submit(root.querySelector('form')); assert.equal(state.habits.profile.photo, photo);
});
test('Avatar displays untrusted names as text and falls back when an image cannot decode', t => {
  const root = setup(t); renderAvatar(root, {name: '<script>', photo: 'https://example.com/x'});
  assert.equal(root.querySelector('img,script'), null);
  renderAvatar(root, {name: '冒険者', photo}); root.querySelector('img').dispatchEvent(new window.Event('error'));
  assert.equal(root.textContent, '冒'); assert.equal(root.querySelector('img'), null);
});
