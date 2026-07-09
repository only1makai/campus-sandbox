"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PackageCheck } from "lucide-react";
import { markThriftSold } from "@/app/actions/requests";
import { tapPress, transitionFast } from "@/lib/motion";

/** Owner-only: end a thrift listing early (update_thrift_status → 'sold'). */
export default function MarkSoldButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  const click = () => {
    setError(null);
    startT(async () => {
      const result = await markThriftSold(postId);
      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="mt-2">
      <motion.button
        type="button"
        onClick={click}
        disabled={busy}
        whileTap={tapPress}
        transition={transitionFast}
        className="flex w-full items-center justify-center gap-1.5 rounded-btn border-2 border-ink bg-card px-3 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-paper disabled:opacity-60"
      >
        <PackageCheck size={15} />
        {busy ? "…" : "Mark as sold"}
      </motion.button>
      {error && (
        <p className="mt-1 rounded-chip border-2 border-ink bg-tomato px-2 py-1 text-meta font-semibold text-white">
          {error}
        </p>
      )}
    </div>
  );
}
