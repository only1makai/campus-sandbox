"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { startRequest } from "@/app/actions/requests";
import { tapPress, transitionBase, transitionFast } from "@/lib/motion";

/**
 * Card affordance: opens an inline composer for the buyer's first message, then
 * create_request + send_request_message and routes into the new thread. Works
 * for shop and thrift. Not rendered for the seller's own listing or sold items
 * (the card decides that).
 */
export default function RequestButton({ postId }: { postId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  const submit = () => {
    setError(null);
    startT(async () => {
      const result = await startRequest(postId, body);
      if (!result.ok) {
        if (result.reason === "auth_required") {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setError(result.message ?? "Something went wrong.");
        return;
      }
      router.push(`/requests/${result.requestId}`);
    });
  };

  return (
    <div className="relative mt-2">
      <motion.button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setError(null);
        }}
        whileTap={tapPress}
        transition={transitionFast}
        className="flex w-full items-center justify-center gap-1.5 rounded-btn border-2 border-ink bg-gold px-3 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover active:bg-gold-active"
      >
        <MessageCircle size={15} />
        {open ? "Close" : "Request"}
      </motion.button>

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
              maxLength={1000}
              placeholder="Introduce yourself — what are you interested in?"
              className="mt-2 w-full rounded-btn border-2 border-ink bg-cream p-2 text-body text-ink placeholder:text-text-faint focus:bg-card focus:outline-none"
            />
            {error && (
              <p className="mt-1 rounded-chip border-2 border-ink bg-tomato px-2 py-1 text-meta font-semibold text-white">
                {error}
              </p>
            )}
            <motion.button
              type="button"
              onClick={submit}
              disabled={busy || body.trim().length < 1}
              whileTap={tapPress}
              transition={transitionFast}
              className="mt-2 w-full rounded-btn border-2 border-ink bg-gold px-3 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover active:bg-gold-active disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send request"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
