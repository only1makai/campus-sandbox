"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, Tag, MessageSquare } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Board", icon: Home, match: (p: string) => p === "/" },
  { href: "/market", label: "Market", icon: Store, match: (p: string) => p === "/market" },
  { href: "/thrift", label: "Thrift", icon: Tag, match: (p: string) => p === "/thrift" },
  {
    href: "/requests",
    label: "Requests",
    icon: MessageSquare,
    match: (p: string) => p.startsWith("/requests"),
  },
];

/** Bottom tab bar for mobile — the Sidebar is desktop-only (md+). */
export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t-2 border-ink bg-cream md:hidden">
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const active = it.match(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
              active ? "text-ink" : "text-text-faint"
            }`}
          >
            <Icon size={20} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
