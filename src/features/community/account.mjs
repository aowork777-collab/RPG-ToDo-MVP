import { renderAvatar } from "../habits/photo.mjs";
import { cloud, query, requireRows } from "./client.mjs";
import { el, button, link, field, panel, notice, run } from "../habits/dom.mjs";
import { createBackup, restoreBackup, parseBackup } from "../backup/backup.mjs";
import { beginGoogleSignIn } from "./auth.mjs";

export function renderSignIn(root, refresh, authClient = cloud.auth) {
  const card = panel("一緒に続ける、最初の一歩", "家族とやることを分け合ったり、同じ目標の仲間を応援したり。ログインすると仲間の機能が使えます。");
  card.classList.add("signin-card");
  card.prepend(el("p", "privacy-pill", "個人のタスクは自動公開されません"));
  const benefits = el("div", "feature-grid");
  for (const [mark, heading, description] of [["01", "招待した人と共有", "ボードを作り、相手を招待。見るだけ・編集できる、の権限を選べます。"], ["02", "同じ目標を応援", "興味のあるタグのサークルで、今日できたことを報告できます。"], ["03", "記録をクラウドに保管", "自分専用のバックアップを手動で保存・復元できます。"]]) {
    const item = el("article", "feature-card"); item.append(el("span", "feature-number", mark), el("h3", "", heading), el("p", "muted", description)); benefits.append(item);
  }
  card.append(benefits);
  const login = button("Googleでログイン", () => run(login, async () => {
    notice("Googleのログイン画面へ移動します…");
    await beginGoogleSignIn(authClient, location.href, window);
  }), "hub-button primary google-login");
  card.append(login, el("p", "muted", "初めての方もこのボタンから。Googleの画面で認証し、このアプリへ戻ります。"), link("ログインせず、個人のタスクを使う →", "./index.html", "text-link"));
  const help = el("details", "hub-details login-help"); help.append(el("summary", "", "ログインできないとき"));
  const tips = el("ul");
  for (const text of ["SNSなどのアプリ内で開いている場合は、SafariやChromeで開き直してください。", "キャンセルした場合は、この画面からもう一度ログインしてください。", "「401: invalid_client」が出る場合は、アプリの認証設定の問題です。運営にエラー名をお知らせください。あなたのToDoデータを削除する必要はありません。"]) tips.append(el("li", "", text));
  help.append(tips); card.append(help); root.append(card);
}

export async function renderAccount(root, user, state, refresh, signedOut = refresh) {
  const account = panel("ログイン中", user.email || "アカウントを接続しています。");
  const code = field("あなたの招待先ID（相手に伝えるID）", "account-id", user.id);
  code.querySelector("input").readOnly = true;
  const copy = button("招待先IDをコピー", () => run(copy, async () => { await navigator.clipboard.writeText(user.id); notice("IDをコピーしました。共有ボードの持ち主に伝えてください。"); }));
  const logout = button("ログアウト", () => run(logout, async () => { await query(cloud.auth.signOut({scope: "local"})); await signedOut(); }));
  account.append(code, copy, logout, el("p", "muted", "ログアウトすると共有画面を閉じます。この端末の個人ToDoは残ります。共用端末では設定画面からバックアップしてデータを管理してください。"));
  account.append(el("p", "muted", "Googleアカウントのパスワードやログイン保護は、Google側のアカウント設定で管理してください。"));
  root.append(account);

  const profile = panel("仲間に見せるプロフィール", "この端末のプロフィールをコピーします。共有ボードに個人タスク全体を公開する機能ではありません。");
  let remoteProfile = await query(cloud.from("profiles").select("*").eq("id", user.id).maybeSingle());
  const visible = el("label", "hub-check"), checkbox = el("input"); checkbox.type = "checkbox"; checkbox.checked = Boolean(remoteProfile?.discoverable);
  visible.append(checkbox, el("span", "", "タグ検索でプロフィールを見つけてもらう（ログイン利用者に写真・名前・目標・タグを公開）"));
  const publish = button("現在のプロフィールを保存", () => run(publish, async () => {
    const p = state.habits.profile;
    const fields = {display_name: p.name, avatar: "user", avatar_photo: p.photo || null, goal: p.goal, tags: p.tags, discoverable: checkbox.checked};
    if (remoteProfile) requireRows(await query(cloud.from("profiles").update(fields).eq("id", user.id).select("id")));
    else await query(cloud.from("profiles").insert({id: user.id, ...fields}));
    remoteProfile = fields; notice("仲間向けプロフィールを保存しました。");
  }));
  const identity = el("div", "profile-identity");
  identity.append(renderAvatar(el("div", "profile-avatar"), state.habits.profile), el("strong", "", state.habits.profile.name));
  profile.append(identity, visible, publish); root.append(profile);

  const backup = panel("自分専用のクラウド保管", "個人ToDo・功績・冒険をまとめて保管します。自動同期ではありません。別の端末では、ログインして「復元」を選んでください。");
  const snapshot = await query(cloud.from("cloud_saves").select("revision,updated_at").eq("user_id", user.id).maybeSingle());
  backup.append(el("p", "muted", snapshot ? `最終保存：${new Date(snapshot.updated_at).toLocaleString("ja-JP")} / 版 ${snapshot.revision}` : "まだクラウドに保存していません。"));
  const upload = button("この端末のデータをクラウドに保存", () => run(upload, async () => {
    if (!confirm("この端末の個人ToDoと冒険をクラウドに保存します。以前のクラウド保管は置き換わります。続けますか？")) return;
    const payload = JSON.parse(createBackup());
    if (snapshot) requireRows(await query(cloud.from("cloud_saves").update({payload}).eq("user_id", user.id).eq("revision", snapshot.revision).select("revision")));
    else await query(cloud.from("cloud_saves").insert({user_id: user.id, payload}));
    notice("クラウドに保存しました。"); refresh();
  }));
  const download = button("クラウドからこの端末へ復元", () => run(download, async () => {
    const remote = await query(cloud.from("cloud_saves").select("payload").eq("user_id", user.id).single());
    const backupText = JSON.stringify(remote.payload);
    parseBackup(backupText);
    if (!confirm("この端末のToDo・レベル・冒険をクラウドの記録に置き換えます。端末の現在の状態は復元前バックアップに残します。続けますか？")) return;
    restoreBackup(backupText); location.reload();
  })); download.disabled = !snapshot;
  const erase = button("クラウド保管だけ削除", () => run(erase, async () => { if (!confirm("自分のクラウド保管を削除しますか？この端末の記録は残ります。")) return; await query(cloud.from("cloud_saves").delete().eq("user_id", user.id)); notice("クラウド保管を削除しました。"); refresh(); })); erase.disabled = !snapshot;
  backup.append(upload, download, erase); root.append(backup);
}
