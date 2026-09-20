import { createClient } from "../../vendor/supabase.mjs";
import { authErrorMessage } from "./auth.mjs";

// Publishable key: access is enforced by database RLS, never by this key's secrecy.
export const cloud = createClient("https://rxvdnikizkyfavczoyym.supabase.co", "sb_publishable_FOkzOdXd_9pAl1Xc4Wz5xA_ayVM1Pwc", {
  // The browser SDK automatically exchanges the PKCE callback before getSession resolves.
  auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce"},
});
export async function query(request) {
  const {data, error} = await request;
  if (error) {
    if (/invalid_client|deleted_client/i.test(`${error.code || ""} ${error.message || ""}`)) throw Error(authErrorMessage("invalid_client"));
    if (error.code === "23505") throw Error("すでに登録されています。招待・参加・今日の報告は1回ずつです。");
    if (error.code === "42501" || error.code === "23503") throw Error("権限がないか、指定した相手・データが見つかりません。更新して確認してください。");
    if (error.message?.includes("Invalid login")) throw Error("メールアドレスまたはパスワードを確認してください。");
    if (error.message?.includes("Email not confirmed")) throw Error("メールの確認が完了していません。受信したメールを確認してください。");
    if (/rate limit|email.*address.*not.*authorized|Error sending/i.test(error.message)) throw Error("確認メールを送信できませんでした。時間を置いて再試行してください。解決しない場合は運営側のメール配信設定の確認が必要です。");
    throw Error(error.message || "通信できません。接続を確認して再試行してください。");
  }
  return data;
}
export async function currentUser() { const {data, error} = await cloud.auth.getSession(); if (error) throw error; return data.session?.user || null; }
export function requireRows(rows) { if (!rows?.length) throw Error("変更できませんでした。権限が取り消されたか、ほかの端末で更新されています。再読み込みしてください。"); return rows; }
