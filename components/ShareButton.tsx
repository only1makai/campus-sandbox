"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

/**
 * Copies the current listing's URL to the clipboard with a brief "Link copied"
 * confirmation. Lives in the detail shell, so both the intercepted overlay and
 * the bare `/p/[id]` page get it (the URL bar reads `/p/[id]` in both states, so
 * `window.location.href` is the shareable link either way). No backend.
 */
export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked (rare); leave the button idle rather than erroring
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy link to this listing"
      className="flex shrink-0 items-center gap-1 rounded-btn border-2 border-ink bg-card px-2.5 py-1 text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-paper"
    >
      {copied ? <Check size={14} className="text-live-green" /> : <Link2 size={14} />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
