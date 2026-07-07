"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { isUcscEmail, isValidHandle } from "@/lib/identity";

export interface AuthResult {
  ok: boolean;
  error?: string;
  /** signup landed but needs email confirmation */
  confirmationPending?: boolean;
}

/**
 * UCSC-gated email+password signup. The domain check here gives a friendly
 * error; the auth.users BEFORE INSERT trigger is the hard gate.
 */
export async function signUpAction(input: {
  email: string;
  password: string;
  handle: string;
  displayName: string;
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  if (!isUcscEmail(email)) {
    return { ok: false, error: "Campus Sandbox is UCSC-only — use your @ucsc.edu email." };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "Password needs at least 8 characters." };
  }
  const handle = input.handle.trim().toLowerCase();
  if (!isValidHandle(handle)) {
    return {
      ok: false,
      error: "Handle: 2–27 characters, lowercase letters, numbers, dots, dashes.",
    };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { handle, display_name: input.displayName.trim() || handle },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) return { ok: false, error: error.message };

  // With email confirmation enabled there's no session yet.
  if (!data.session) return { ok: true, confirmationPending: true };
  redirect("/");
}

export async function signInAction(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (error) return { ok: false, error: error.message };
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
