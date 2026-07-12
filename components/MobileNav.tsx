"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, Tag, MessageSquare, User } from "lucide-react";

/** Bottom tab bar for mobile — the Sidebar is desktop-only (md+). */
export default function MobileNav({ youHref }: { youHref: string }) {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Beta Board", icon: Home, match: (p: string) => p === "/" },
    { href: "/market", label: "Market", icon: Store, match: (p: string) => p === "/market" },
    { href: "/thrift", label: "Thrift", icon: Tag, match: (p: string) => p === "/thrift" },
    {
      href: "/requests",
      label: "Requests",
      icon: MessageSquare,
      match: (p: string) => p.startsWith("/requests"),
    },
    { href: youHref, label: "You", icon: User, match: (p: string) => p.startsWith("/u/") },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t-2 border-ink bg-cream md:hidden">
      {items.map((it) => {
        const Icon = it.icon;
        const active = it.match(pathname);
        return (
          <Link
            key={it.label}
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
