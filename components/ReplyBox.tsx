"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { replyToReview } from "@/app/actions/studio";
import { tapPress, transitionFast } from "@/lib/motion";

/** Inline maker reply to a review (one per review). Shows the given reply once set. */
export default function ReplyBox({
  reviewId,
  existingReply,
}: {
  reviewId: string;
  existingReply: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  if (existingReply) {
    return (
      <div className="mt-2 rounded-btn border-2 border-border-soft bg-cream px-3 py-2 text-meta text-text-secondary">
        <span className="font-semibold text-ink">You replied:</span> {existingReply}
      </div>
    );
  }

  const submit = () => {
    setError(null);
    startT(async () => {
      const r = await replyToReview(reviewId, text);
      if (!r.ok) {
        setError(r.message ?? "Something went wrong.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-btn border-2 border-ink bg-card px-3 py-1.5 text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-paper"
      >
        Reply
      </button>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Reply to this reviewer…"
        className="w-full rounded-btn border-2 border-ink bg-cream p-2 text-body text-ink placeholder:text-text-faint focus:bg-card focus:outline-none"
      />
      {error && (
        <p className="mt-1 rounded-chip border-2 border-ink bg-tomato px-2 py-1 text-meta font-semibold text-white">
          {error}
        </p>
      )}
      <motion.button
        type="button"
        onClick={submit}
        disabled={busy || text.trim().length < 1}
        whileTap={tapPress}
        transition={transitionFast}
        className="mt-2 rounded-btn border-2 border-ink bg-gold px-3 py-2 text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send reply"}
      </motion.button>
    </div>
  );
}
