import { normalizeTags } from './state.mjs';
import { normalizePhoto, prepareProfilePhoto, renderAvatar } from './photo.mjs';
import { el, button, field, selectField, panel, submit, notice } from './dom.mjs';
import { getProgress } from '../../model.mjs';

export function renderProfileEditor(root, state, commit, preparePhoto = prepareProfilePhoto) {
  const p = state.habits.profile;
  let draftPhoto = normalizePhoto(p.photo), request = 0, processing = false;
  const summary = panel(p.name, `プレイヤーレベル ${getProgress(state.totalXp).level} · ${state.totalXp} XP`);
  const form = el('form', 'hub-form');
  const photoArea = el('div', 'profile-photo-editor');
  const preview = renderAvatar(el('div', 'profile-avatar profile-avatar-large'), p);
  const controls = el('div', 'profile-photo-controls');
  const fileLabel = el('label', 'hub-field', 'プロフィール写真');
  const input = el('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp';
  input.setAttribute('aria-label', 'プロフィール写真を選択');
  const status = el('p', 'muted', '写真の中央を正方形に切り取り、小さくして保存します。JPEG・PNG・WebP、10MBまで。');
  status.setAttribute('role', 'status');
  const save = submit('プロフィールを保存');
  const redraw = () => renderAvatar(preview, {name: form.elements.name?.value || p.name, photo: draftPhoto});
  const remove = button('写真を削除', () => {
    request++; processing = false; save.disabled = false; draftPhoto = null; input.value = ''; remove.disabled = true; redraw();
    status.textContent = '写真を削除するには「プロフィールを保存」を押してください。';
  }); remove.disabled = !draftPhoto;
  input.addEventListener('change', async () => {
    const file = input.files?.[0]; if (!file) return;
    const id = ++request; processing = true; save.disabled = true;
    status.textContent = '写真を準備しています…';
    try {
      const photo = normalizePhoto(await preparePhoto(file));
      if (id !== request) return;
      if (!photo) throw Error('写真を読み込めませんでした。');
      draftPhoto = photo; redraw(); remove.disabled = false;
      status.textContent = '写真を確認し、「プロフィールを保存」を押してください。';
    } catch (error) { if (id === request) status.textContent = error.message; }
    finally { if (id === request) {processing = false; save.disabled = false; input.value = ''; } }
  });
  fileLabel.append(input); controls.append(fileLabel, remove, status); photoArea.append(preview, controls);
  form.append(photoArea, field('表示名', 'name', p.name, {required: true, max: 30, autocomplete: 'nickname'}), field('目指していること', 'goal', p.goal, {max: 140, placeholder: '例：3か月後に英語で自己紹介できるようになる'}), field('興味のあるタグ（5個まで・カンマ区切り）', 'tags', p.tags.join(', '), {max: 104, placeholder: '英語, 勉強, 読書'}), selectField('1つ以上達成する日を、週に何日つくる？', 'weeklyGoal', Array.from({length: 7}, (_, i) => [i + 1, `週 ${i + 1} 日`]), state.habits.weeklyGoal), el('p', 'muted', 'ここで保存する写真はこの端末用です。仲間にも見せる場合は「仲間」→「アカウント・保管」からプロフィールを公開してください。'), save);
  form.elements.name.addEventListener('input', redraw);
  form.addEventListener('submit', event => {
    event.preventDefault(); if (processing) return;
    const data = new FormData(form), name = String(data.get('name')).trim(); if (!name) return;
    const previousProfile = state.habits.profile, previousGoal = state.habits.weeklyGoal;
    state.habits.profile = {name, avatar: 'user', photo: draftPhoto, goal: String(data.get('goal')).trim(), tags: normalizeTags(data.get('tags'))};
    state.habits.weeklyGoal = Number(data.get('weeklyGoal'));
    if (commit()) {summary.querySelector('h2').textContent = name; notice('プロフィールを保存しました。仲間向けの公開は「仲間」のアカウントから選べます。');}
    else {state.habits.profile = previousProfile; state.habits.weeklyGoal = previousGoal;}
  });
  summary.append(form); root.append(summary);
}
