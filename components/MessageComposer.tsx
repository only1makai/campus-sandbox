"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SendHorizontal } from "lucide-react";
import { sendMessage } from "@/app/actions/requests";
import { tapPress, transitionFast } from "@/lib/motion";

/**
 * Thread composer. Disabled when the request is closed (declined/expired) or the
 * 20-message cap is hit — both surfaced calmly. On success, refreshes the server
 * component so the new message appears (no realtime; no notifications).
 */
export default function MessageComposer({
  requestId,
  closed,
  atCap,
}: {
  requestId: string;
  closed?: boolean;
  atCap?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  if (closed) {
    return (
      <p className="rounded-btn border-2 border-border-soft bg-cream px-3 py-2 text-meta text-text-secondary">
        This request is closed — no more messages can be sent.
      </p>
    );
  }
  if (atCap) {
    return (
      <p className="rounded-btn border-2 border-border-soft bg-cream px-3 py-2 text-meta text-text-secondary">
        This thread is full — wrap up or exchange contact info.
      </p>
    );
  }

  const submit = () => {
    setError(null);
    startT(async () => {
      const result = await sendMessage(requestId, body);
      if (!result.ok) {
        if (result.reason === "auth_required") {
          router.push("/login");
          return;
        }
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setBody("");
      router.refresh();
    });
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {error && (
        <p className="rounded-chip border-2 border-ink bg-tomato px-2 py-1 text-meta font-semibold text-white">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Write a message…"
          className="min-w-0 flex-1 rounded-btn border-2 border-ink bg-cream p-2 text-body text-ink placeholder:text-text-faint focus:bg-card focus:outline-none"
        />
        <motion.button
          type="submit"
          disabled={busy || body.trim().length < 1}
          whileTap={tapPress}
          transition={transitionFast}
          className="flex shrink-0 items-center gap-1.5 rounded-btn border-2 border-ink bg-gold px-4 py-2.5 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover active:bg-gold-active disabled:opacity-60"
        >
          <SendHorizontal size={15} />
          {busy ? "…" : "Send"}
        </motion.button>
      </div>
    </form>
  );
}
