"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Rocket,
  ArrowBigUp,
  Users,
  FlaskConical,
  Bookmark,
  Store,
  Tag,
  MessageSquare,
} from "lucide-react";
import type { CurrentUser } from "@/types";

function NavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-btn px-3 py-2 text-body font-semibold transition-colors ${
        active ? "bg-card text-ink shadow-resting" : "text-text-secondary hover:bg-cream hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

/** Not built yet — shown for visual completeness, honestly non-functional
 *  (same "coming soon" pattern as NetworkStrip). No fake data behind these. */
function ComingSoonRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex cursor-not-allowed items-center gap-3 rounded-btn border border-dashed border-border-soft px-3 py-2 text-body text-text-faint">
      {icon}
      {label}
      <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide">Soon</span>
    </div>
  );
}

export default function Sidebar({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-1 border-r-2 border-ink bg-paper px-3 py-6 md:flex">
      <NavLink href="/" icon={<Home size={18} />} label="Beta Board" active={pathname === "/"} />
      <NavLink
        href="/market"
        icon={<Store size={18} />}
        label="Marketplace"
        active={pathname === "/market"}
      />
      <NavLink
        href="/thrift"
        icon={<Tag size={18} />}
        label="Thrift"
        active={pathname === "/thrift"}
      />

      <div className="my-3 border-t border-border-soft" />

      {user ? (
        <>
          <NavLink
            href="/ships"
            icon={<Rocket size={18} />}
            label="Your ships"
            active={pathname === "/ships"}
          />
          <NavLink
            href="/upvoted"
            icon={<ArrowBigUp size={18} />}
            label="Upvoted"
            active={pathname === "/upvoted"}
          />
          <NavLink
            href="/requests"
            icon={<MessageSquare size={18} />}
            label="Requests"
            active={pathname.startsWith("/requests")}
          />
          <ComingSoonRow icon={<Users size={18} />} label="Following" />
          <ComingSoonRow icon={<FlaskConical size={18} />} label="Testing" />
          <ComingSoonRow icon={<Bookmark size={18} />} label="Saved" />
        </>
      ) : (
        <p className="px-3 text-meta text-text-faint">
          <Link href="/login" className="font-semibold text-link-blue hover:underline">
            Sign in
          </Link>{" "}
          to see your ships, upvotes, and more.
        </p>
      )}
    </aside>
  );
}
