import { renderAvatar } from "../habits/photo.mjs";
import { createIcon } from "../../ui/icons.mjs";
import { cloud, query } from "./client.mjs";
import { dateKey, weekStart } from "../habits/state.mjs";
import { el, button, field, selectField, panel, submit, empty, notice, run } from "../habits/dom.mjs";

export async function renderGroups(root, user, state) {
  const [groups, memberships] = await Promise.all([
    query(cloud.from("habit_groups").select("*").order("created_at", {ascending: false}).limit(100)),
    query(cloud.from("group_members").select("group_id").eq("user_id", user.id)),
  ]);
  async function refresh() { if (!root.isConnected) return; root.replaceChildren(); await renderGroups(root, user, state); }
  const introduction = panel("同じ目標の仲間と、少しずつ", "タグのサークルに参加し、できたことを1日1回報告。みんなの報告数で週の目標を目指します。個人タスクの名前や記録は自動投稿しません。");
  const search = field("タグを探す", "tag-search", "", {max: 20, placeholder: "勉強、運動、読書…"}); introduction.append(search);
  const create = el("details", "hub-details"); create.append(el("summary", "", "新しいサークルを作る"));
  const form = el("form", "hub-form"), save = submit("サークルを作成して参加");
  form.append(field("タグ名", "tag", "", {max: 20, required: true}), field("サークルの説明（ログイン利用者に公開）", "description", "", {max: 140}), selectField("みんなの週間目標（報告数）", "goal", [[7, "7回"], [20, "20回"], [50, "50回"], [100, "100回"]], 20), save);
  form.addEventListener("submit", event => {event.preventDefault(); run(save, async () => {
    const data = new FormData(form), tag = String(data.get("tag")).trim().replace(/^#+/, ""); if (!tag) return;
    const group = await query(cloud.from("habit_groups").insert({tag, description: String(data.get("description")).trim(), weekly_goal: Number(data.get("goal")), owner_id: user.id}).select().single());
    await query(cloud.from("group_members").insert({group_id: group.id, user_id: user.id})); await refresh();
  });}); create.append(form); introduction.append(create, button("仲間の報告を更新", () => refresh())); root.append(introduction);
  const directory = el("div", "group-directory"); root.append(directory);
  const joinedRoot = el("div", "hub-stack"); root.append(joinedRoot);
  function drawDirectory() {
    const term = search.querySelector("input").value.trim().toLocaleLowerCase(); directory.replaceChildren();
    const visible = groups.filter(group => group.tag.toLocaleLowerCase().includes(term));
    for (const group of visible) {
      const joined = memberships.some(member => member.group_id === group.id), card = panel(`#${group.tag}`, group.description);
      card.append(el("small", "muted", `週間目標 ${group.weekly_goal} 回の報告`));
      const join = button(joined ? "参加中" : "このサークルに参加", () => run(join, async () => { await query(cloud.from("group_members").insert({group_id: group.id, user_id: user.id})); await refresh(); })); join.disabled = joined; card.append(join); directory.append(card);
    }
    if (!visible.length) directory.append(empty("サークルが見つかりません", "新しく作ると、同じタグの人が参加できます。"));
  }
  search.querySelector("input").addEventListener("input", drawDirectory); drawDirectory();
  for (const group of groups.filter(group => memberships.some(member => member.group_id === group.id))) {
    const [posts, members] = await Promise.all([
      query(cloud.from("group_checkins").select("*").eq("group_id", group.id).gte("day", weekStart()).order("created_at", {ascending: false})),
      query(cloud.from("group_members").select("user_id").eq("group_id", group.id)),
    ]);
    const cheers = posts.length ? await query(cloud.from("cheers").select("*").in("checkin_id", posts.map(post => post.id))) : [];
    const card = panel(`#${group.tag} の今週`, `${members.length}人で ${posts.length} / ${group.weekly_goal} 回の報告`), progress = el("progress"); progress.max = group.weekly_goal; progress.value = posts.length; progress.setAttribute("aria-label", "サークルの週間目標の達成数"); card.append(progress);
    const posted = posts.some(post => post.user_id === user.id && post.day === dateKey());
    if (!posted) {
      const postForm = el("form", "hub-form"), post = submit("今日できたことを報告");
      postForm.append(field("参加者に見せるひとこと", "message", "", {required: true, max: 200, placeholder: "例：今日は5分だけ本を読めた！"}), el("p", "muted", `名前「${state.habits.profile.name}」とこの文章だけをサークル内に投稿します。住所・連絡先などは書かないでください。`), post);
      postForm.addEventListener("submit", event => {event.preventDefault(); run(post, async () => { const message = String(new FormData(postForm).get("message")).trim(); if (!message) return; await query(cloud.from("group_checkins").insert({group_id: group.id, user_id: user.id, day: dateKey(), nickname: state.habits.profile.name, message})); await refresh(); notice("今日の一歩を報告しました。"); });}); card.append(postForm);
    } else card.append(el("p", "success-copy", "✓ 今日の報告は完了。仲間の一歩にもエールを送ろう。"));
    if (!posts.length) card.append(empty("今週の最初の一歩を", "小さな達成から気軽に報告しましょう。"));
    for (const post of posts.slice(0, 60)) {
      const item = el("article", "checkin-card"); item.append(el("small", "muted", `${post.nickname} · ${post.day}`), el("p", "", post.message));
      const supporters = cheers.filter(cheer => cheer.checkin_id === post.id), mine = supporters.some(cheer => cheer.user_id === user.id);
      const cheer = button(`${mine ? "エール済み" : "エール"} ${supporters.length}`, () => run(cheer, async () => { if (mine) await query(cloud.from("cheers").delete().eq("checkin_id", post.id).eq("user_id", user.id)); else await query(cloud.from("cheers").insert({checkin_id: post.id, user_id: user.id})); await refresh(); })); cheer.prepend(createIcon("heart")); cheer.disabled = post.user_id === user.id; cheer.setAttribute("aria-pressed", String(mine)); item.append(cheer);
      if (post.user_id === user.id || group.owner_id === user.id) { const remove = button("投稿を削除", () => run(remove, async () => { if (!confirm("この投稿を削除しますか？")) return; await query(cloud.from("group_checkins").delete().eq("id", post.id)); await refresh(); }), "hub-button subtle"); item.append(remove); } card.append(item);
    }
    const leave = button("このサークルを退会", () => run(leave, async () => { if (!confirm("サークルを退会しますか？過去の投稿は残ります。消したい投稿は先に削除してください。")) return; await query(cloud.from("group_members").delete().eq("group_id", group.id).eq("user_id", user.id)); await refresh(); })); card.append(leave);
    if (group.owner_id === user.id) { const remove = button("サークルを閉じる", () => run(remove, async () => { if (!confirm("サークルと全員の投稿・エールを削除しますか？")) return; await query(cloud.from("habit_groups").delete().eq("id", group.id)); await refresh(); }), "hub-button danger"); card.append(remove); }
    joinedRoot.append(card);
  }
  const discover = panel("同じタグの冒険者", "プロフィールを公開すると設定した人だけが表示されます。");
  if (state.habits.profile.tags.length) {
    const people = await query(cloud.from("profiles").select("id,display_name,avatar,avatar_photo,goal,tags").eq("discoverable", true).overlaps("tags", state.habits.profile.tags).neq("id", user.id).limit(24));
    for (const person of people) { const row = el("article", "checkin-card"); row.append(renderAvatar(el("div", "profile-avatar"), {name: person.display_name, photo: person.avatar_photo}), el("strong", "", person.display_name), el("p", "", person.goal), el("small", "muted", person.tags.map(tag => `#${tag}`).join(" "))); discover.append(row); }
    if (!people.length) discover.append(empty("同じタグの仲間はまだ見つかりません", "プロフィールのタグを増やすか、サークルを作ってみましょう。"));
  } else discover.append(el("p", "muted", "プロフィールで興味のあるタグを設定してください。")); root.append(discover);
}
