"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { setRequestStatus } from "@/app/actions/requests";
import { tapPress, transitionFast } from "@/lib/motion";

/**
 * Seller-only controls on an open request: mark fulfilled or decline. Either
 * participant is allowed by the RPC, but per the spec only the seller sees
 * these. Buyer sees the resulting state change on refresh.
 */
export default function RequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  const act = (status: "fulfilled" | "declined") => {
    setError(null);
    startT(async () => {
      const result = await setRequestStatus(requestId, status);
      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <motion.button
          type="button"
          onClick={() => act("fulfilled")}
          disabled={busy}
          whileTap={tapPress}
          transition={transitionFast}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-btn border-2 border-ink bg-live-green px-3 py-2 font-sans text-meta font-semibold text-white shadow-resting transition-shadow hover:shadow-elevated disabled:opacity-60"
        >
          <Check size={15} />
          Mark fulfilled
        </motion.button>
        <motion.button
          type="button"
          onClick={() => act("declined")}
          disabled={busy}
          whileTap={tapPress}
          transition={transitionFast}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-btn border-2 border-ink bg-card px-3 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-paper disabled:opacity-60"
        >
          <X size={15} />
          Decline
        </motion.button>
      </div>
      {error && (
        <p className="rounded-chip border-2 border-ink bg-tomato px-2 py-1 text-meta font-semibold text-white">
          {error}
        </p>
      )}
    </div>
  );
}
