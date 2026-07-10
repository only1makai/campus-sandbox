"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export type TesterResult =
  | { ok: true }
  | { ok: false; reason: "auth_required" | "error"; message?: string };

function friendlyJoin(m: string): string {
  const s = m.toLowerCase();
  if (s.includes("beta is full")) return "This beta is full — no tester slots left.";
  if (s.includes("duplicate") || s.includes("unique")) return "You've already joined this beta.";
  if (s.includes("your own app")) return "You can't join your own app.";
  if (s.includes("example app")) return "This is an example app — joining is disabled.";
  return m;
}

function friendlyFeedback(m: string): string {
  const s = m.toLowerCase();
  if (s.includes("join as a tester")) return "Join as a tester first to leave feedback.";
  if (s.includes("duplicate") || s.includes("unique")) return "You've already left feedback on this app.";
  if (s.includes("your own app")) return "You can't leave feedback on your own app.";
  return m;
}

export async function joinAsTester(postId: string): Promise<TesterResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  const { error } = await supabase.rpc("join_as_tester", { p_post_id: postId });
  if (error) return { ok: false, reason: "error", message: friendlyJoin(error.message) };
  revalidatePath("/");
  return { ok: true };
}

export async function submitAppFeedback(postId: string, body: string): Promise<TesterResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  const trimmed = body.trim();
  if (trimmed.length < 3 || trimmed.length > 280) {
    return { ok: false, reason: "error", message: "Feedback must be 3–280 characters." };
  }
  const { error } = await supabase.rpc("record_app_feedback", { p_post_id: postId, p_body: trimmed });
  if (error) return { ok: false, reason: "error", message: friendlyFeedback(error.message) };
  revalidatePath("/");
  return { ok: true };
}
