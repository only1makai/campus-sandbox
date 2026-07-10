"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, ExternalLink, MessageSquarePlus } from "lucide-react";
import { joinAsTester, submitAppFeedback } from "@/app/actions/tester";
import { tapPress, transitionBase, transitionFast } from "@/lib/motion";

/**
 * Beta Board tester flow (real, non-demo, non-own apps). Not joined + slots left
 * → "Join as tester"; joined → the install link + an inline feedback composer
 * ("Join to install the beta and unlock the feedback box"); full → disabled.
 */
export default function TesterActions({
  postId,
  ctaUrl,
  ctaLabel,
  initialJoined,
  full,
  className = "",
}: {
  postId: string;
  ctaUrl: string;
  ctaLabel: string;
  initialJoined: boolean;
  full: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [joined, setJoined] = useState(initialJoined);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  const join = () => {
    setError(null);
    startT(async () => {
      const r = await joinAsTester(postId);
      if (!r.ok) {
        if (r.reason === "auth_required") {
          router.push("/login?next=/");
          return;
        }
        setError(r.message ?? "Something went wrong.");
        return;
      }
      setJoined(true);
      router.refresh();
    });
  };

  const send = () => {
    setError(null);
    startT(async () => {
      const r = await submitAppFeedback(postId, body);
      if (!r.ok) {
        setError(r.message ?? "Something went wrong.");
        return;
      }
      setSent(true);
      setOpen(false);
    });
  };

  if (!joined) {
    if (full) {
      return (
        <span
          className={`flex items-center justify-center gap-1.5 rounded-btn border-2 border-dashed border-text-faint bg-paper px-4 py-2 text-center font-sans text-meta font-semibold text-text-secondary shadow-resting ${className}`}
        >
          Beta full
        </span>
      );
    }
    return (
      <motion.button
        type="button"
        onClick={join}
        disabled={busy}
        whileTap={tapPress}
        transition={transitionFast}
        className={`flex items-center justify-center gap-1.5 rounded-btn border-2 border-ink bg-gold px-4 py-2 text-center font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover active:bg-gold-active disabled:opacity-60 ${className}`}
      >
        <FlaskConical size={15} />
        {busy ? "Joining…" : "Join as tester"}
        {error && <span className="sr-only">{error}</span>}
      </motion.button>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <a
        href={ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 rounded-btn border-2 border-ink bg-gold px-4 py-2 text-center font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover"
      >
        <ExternalLink size={15} />
        {ctaLabel || "Open the beta"}
      </a>

      {sent ? (
        <p className="text-center text-meta font-semibold text-live-green">Feedback sent — thanks!</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen((o) => !o);
              setError(null);
            }}
            className="flex items-center justify-center gap-1.5 rounded-btn border-2 border-ink bg-cream px-3 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-paper"
          >
            <MessageSquarePlus size={15} />
            {open ? "Close" : "Leave feedback"}
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={transitionBase}
                className="overflow-hidden"
              >
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={2}
                  maxLength={280}
                  placeholder="How's the beta? Bugs, ideas, what worked."
                  className="w-full rounded-btn border-2 border-ink bg-cream p-2 text-body text-ink placeholder:text-text-faint focus:bg-card focus:outline-none"
                />
                {error && (
                  <p className="mt-1 rounded-chip border-2 border-ink bg-tomato px-2 py-1 text-meta font-semibold text-white">
                    {error}
                  </p>
                )}
                <motion.button
                  type="button"
                  onClick={send}
                  disabled={busy || body.trim().length < 3}
                  whileTap={tapPress}
                  transition={transitionFast}
                  className="mt-2 w-full rounded-btn border-2 border-ink bg-gold px-3 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send feedback"}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
