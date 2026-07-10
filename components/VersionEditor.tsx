"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { saveAppDetails } from "@/app/actions/studio";
import { tapPress, transitionFast } from "@/lib/motion";

const input =
  "w-full rounded-btn border-2 border-ink bg-cream px-3 py-2 text-body text-ink placeholder:text-text-faint focus:outline-none focus:bg-card";

/** Maker editor for an app's version/changelog + tester goal/cap. */
export default function VersionEditor({
  postId,
  version,
  changelog,
  testerGoal,
  maxTesters,
}: {
  postId: string;
  version: string | null;
  changelog: string | null;
  testerGoal: number | null;
  maxTesters: number | null;
}) {
  const router = useRouter();
  const [v, setV] = useState(version ?? "");
  const [c, setC] = useState(changelog ?? "");
  const [goal, setGoal] = useState(testerGoal != null ? String(testerGoal) : "");
  const [max, setMax] = useState(maxTesters != null ? String(maxTesters) : "");
  const [state, setState] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  const num = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.round(Number(s))));

  const save = () => {
    setError(null);
    setState("idle");
    startT(async () => {
      const r = await saveAppDetails(postId, v, c, num(goal), num(max));
      if (!r.ok) {
        setError(r.message ?? "Something went wrong.");
        return;
      }
      setState("saved");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-meta font-semibold text-ink">Current version</span>
        <input className={input} value={v} onChange={(e) => setV(e.target.value)} placeholder="v0.9.2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-meta font-semibold text-ink">Changelog</span>
        <textarea
          className={input}
          rows={3}
          value={c}
          onChange={(e) => setC(e.target.value)}
          placeholder="What changed in this build."
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-meta font-semibold text-ink">Tester goal</span>
          <input className={input} value={goal} onChange={(e) => setGoal(e.target.value)} inputMode="numeric" placeholder="e.g. 25" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-meta font-semibold text-ink">Max testers (cap)</span>
          <input className={input} value={max} onChange={(e) => setMax(e.target.value)} inputMode="numeric" placeholder="blank = uncapped" />
        </label>
      </div>
      {error && (
        <p className="rounded-chip border-2 border-ink bg-tomato px-3 py-2 text-meta font-semibold text-white">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          onClick={save}
          disabled={busy}
          whileTap={tapPress}
          transition={transitionFast}
          className="rounded-btn border-2 border-ink bg-gold px-4 py-2 text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </motion.button>
        {state === "saved" && !busy && (
          <span className="text-meta font-semibold text-live-green">All changes saved</span>
        )}
      </div>
    </div>
  );
}
