"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { signInAction, signUpAction } from "@/app/actions/auth";

const INK = "#262014";
const SPRING = [0.34, 1.56, 0.64, 1] as const;

const inputClass =
  "w-full rounded-btn border-2 border-ink bg-cream px-3 py-2 text-body text-ink placeholder:text-text-faint focus:outline-none focus:bg-card";

export default function AuthCard() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [busy, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "signin"
          ? await signInAction({ email, password })
          : await signUpAction({ email, password, handle, displayName });
      // redirect() throws past this point on success
      if (result && !result.ok) setError(result.error ?? "Something went wrong.");
      else if (result?.confirmationPending) setPendingConfirmation(true);
    });
  };

  if (pendingConfirmation) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16, rotate: -1.5 }}
        animate={{ opacity: 1, y: 0, rotate: -1.5 }}
        className="w-full max-w-md rounded-card border-2 border-ink bg-card p-8 text-center shadow-[4px_4px_0_#262014]"
      >
        <span className="mx-auto flex h-14 w-14 rotate-[3deg] items-center justify-center rounded-chip border-2 border-ink bg-gold font-display text-3xl shadow-[2px_2px_0_#262014]">
          ✉
        </span>
        <h2 className="mt-4 font-display text-heading text-ink">Check your inbox</h2>
        <p className="mt-2 text-body text-text-secondary">
          We sent a confirmation link to your @ucsc.edu address. Click it and
          you&apos;re a verified slug.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, rotate: -1.5 }}
      transition={{ duration: 0.24, ease: SPRING }}
      className="w-full max-w-md rounded-card border-2 border-ink bg-card p-8 shadow-[4px_4px_0_#262014]"
    >
      <h1 className="font-display text-heading text-ink">
        {mode === "signin" ? "Welcome back, slug" : "Join the sandbox"}
      </h1>
      <p className="mt-1 text-body text-text-secondary">
        {mode === "signin"
          ? "Sign in to upvote and ship."
          : "UCSC students only — your @ucsc.edu email is your student badge."}
      </p>

      <form
        className="mt-6 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="email"
          required
          placeholder="sammy.slug@ucsc.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        {mode === "signup" && (
          <>
            <input
              type="text"
              required
              placeholder="handle (e.g. sammy.ships)"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
          </>
        )}

        {error && (
          <p className="rounded-chip border-2 border-ink bg-tomato px-3 py-2 text-meta font-semibold text-white">
            {error}
          </p>
        )}

        <motion.button
          type="submit"
          disabled={busy}
          whileTap={{ y: 2, boxShadow: `1px 1px 0 ${INK}` }}
          transition={{ duration: 0.16, ease: SPRING }}
          style={{ boxShadow: `3px 3px 0 ${INK}` }}
          className="mt-1 rounded-btn border-2 border-ink bg-gold px-4 py-2.5 font-sans text-body font-semibold text-ink hover:bg-gold-hover active:bg-gold-active disabled:opacity-60"
        >
          {busy ? "One sec…" : mode === "signin" ? "Sign in" : "Sign up"}
        </motion.button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
        className="mt-4 text-meta font-semibold text-link-blue underline-offset-2 hover:underline"
      >
        {mode === "signin" ? "New here? Create an account" : "Already a slug? Sign in"}
      </button>
    </motion.div>
  );
}
