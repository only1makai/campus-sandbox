"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { CurrentUser } from "@/types";
import { signOutAction } from "@/app/actions/auth";
import { FILL } from "@/lib/colors";

/**
 * Header account trigger + dropdown (touch + desktop). The trigger itself only
 * toggles the menu — "Your profile" is the first menu item, never a direct
 * link on the avatar. Closes on outside tap and Escape.
 */
export default function AccountMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const handle = user.profile?.handle;
  const initial = (user.profile?.handle ?? user.email)[0].toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "block w-full rounded-btn px-3 py-2 text-left text-meta font-semibold text-ink hover:bg-cream";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-btn border-2 border-ink bg-card px-1.5 py-1 shadow-resting transition-shadow hover:shadow-elevated sm:px-2"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink text-[11px] font-bold text-white ${
            FILL[user.profile?.avatarColor ?? "gold"]
          }`}
        >
          {initial}
        </span>
        <span className="hidden text-meta font-semibold text-ink sm:inline">@{handle ?? "…"}</span>
        <ChevronDown size={14} className="text-text-secondary" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 rounded-card border-2 border-ink bg-card p-1.5 shadow-elevated"
        >
          {handle && (
            <Link href={`/u/${handle}`} role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              Your profile
            </Link>
          )}
          <Link href="/studio" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            Studio
          </Link>
          <Link href="/settings/profile" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            Settings
          </Link>
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className={`${itemClass} text-tomato`}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
