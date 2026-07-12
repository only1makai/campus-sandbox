import Link from "next/link";
import { Plus } from "lucide-react";
import type { CurrentUser } from "@/types";
import SearchInput from "@/components/SearchInput";
import AccountMenu from "@/components/AccountMenu";

export default function Header({ user }: { user: CurrentUser | null }) {
  return (
    <header className="flex items-center gap-2 border-b-2 border-ink bg-cream px-3 py-3 sm:gap-4 sm:px-6">
      <Link href="/landing" className="flex shrink-0 items-center gap-2 text-ink">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-chip border-2 border-ink bg-gold text-lg shadow-resting"
          aria-hidden
        >
          🐌
        </span>
        <span className="hidden font-display text-body font-extrabold lowercase tracking-tight text-ink sm:inline">
          campus sandbox
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        <SearchInput />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          href="/sell"
          className="flex items-center gap-1.5 rounded-btn border-2 border-ink bg-gold px-2 py-1.5 text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover sm:px-3"
        >
          <Plus size={14} />
          Sell
        </Link>

        {user ? (
          <AccountMenu user={user} />
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
