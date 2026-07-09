import Link from "next/link";
import { Plus } from "lucide-react";
import type { CurrentUser } from "@/types";
import { signOutAction } from "@/app/actions/auth";
import SearchInput from "@/components/SearchInput";

const FILL: Record<string, string> = {
  gold: "bg-gold",
  "live-green": "bg-live-green",
  "link-blue": "bg-link-blue",
  tomato: "bg-tomato",
  grape: "bg-grape",
};

export default function Header({ user }: { user: CurrentUser | null }) {
  return (
    <header className="flex items-center gap-4 border-b-2 border-ink bg-cream px-6 py-3">
      <Link href="/" className="flex shrink-0 items-center gap-2 text-ink">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-chip border-2 border-ink bg-gold text-lg shadow-resting"
          aria-hidden
        >
          🐌
        </span>
        <span className="font-display text-body font-extrabold lowercase tracking-tight text-ink">
          campus sandbox
        </span>
      </Link>

      <SearchInput />

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <Link
          href="/sell"
          className="flex items-center gap-1.5 rounded-btn border-2 border-ink bg-gold px-3 py-1.5 text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover"
        >
          <Plus size={14} />
          Sell
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href={user.profile ? `/u/${user.profile.handle}` : "/"}
              className="flex items-center gap-2 hover:underline"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink text-[11px] font-bold text-white ${
                  FILL[user.profile?.avatarColor ?? "gold"]
                }`}
              >
                {(user.profile?.handle ?? user.email)[0].toUpperCase()}
              </span>
              <span className="text-meta font-semibold text-ink">
                @{user.profile?.handle ?? "…"}
              </span>
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-btn border-2 border-ink bg-card px-3 py-1.5 text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-paper"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-btn border-2 border-ink bg-gold px-4 py-1.5 text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
