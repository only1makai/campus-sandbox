import Link from "next/link";
import { getCurrentUser } from "@/lib/identity";
import { signOutAction } from "@/app/actions/auth";

const FILL: Record<string, string> = {
  gold: "bg-gold",
  "live-green": "bg-live-green",
  "link-blue": "bg-link-blue",
  tomato: "bg-tomato",
  grape: "bg-grape",
};

export default async function NavBar() {
  const user = await getCurrentUser();

  return (
    <nav className="border-b-2 border-ink bg-cream">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="rotate-[-1deg] rounded-chip border-2 border-ink bg-card px-3 py-1 font-display text-meta font-extrabold tracking-wide text-ink shadow-[2px_2px_0_#262014]"
          >
            CAMPUS SANDBOX
          </Link>
          <Link href="/" className="text-meta font-semibold text-ink hover:underline">
            Beta Board
          </Link>
          <Link href="/market" className="text-meta font-semibold text-ink hover:underline">
            Makers Market
          </Link>
        </div>

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
                className="rounded-btn border-2 border-ink bg-card px-3 py-1.5 text-meta font-semibold text-ink shadow-[2px_2px_0_#262014] hover:bg-paper active:translate-y-[2px] active:shadow-[1px_1px_0_#262014]"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-btn border-2 border-ink bg-gold px-4 py-1.5 text-meta font-semibold text-ink shadow-[2px_2px_0_#262014] hover:bg-gold-hover active:translate-y-[2px] active:shadow-[1px_1px_0_#262014]"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
