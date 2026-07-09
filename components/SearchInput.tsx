"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Writes to the `q` URL param on the current path (debounced). Reads the
 * initial value from window.location directly rather than useSearchParams()
 * — this component lives in the root layout, which isn't itself dynamic, and
 * useSearchParams() there requires a Suspense boundary whose fallback never
 * resolved in practice (Next/Turbopack dev quirk). Pages that want results
 * (Beta Board, Makers Market) read `q` back via useSearchParams() themselves
 * — those routes are already force-dynamic, so it works fine there.
 */
export default function SearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setValue(new URLSearchParams(window.location.search).get("q") ?? "");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handle = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (value) params.set("q", value);
      else params.delete("q");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full max-w-md">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search apps, goods, sellers"
        className="w-full rounded-btn border-2 border-border-soft bg-cream py-2 pl-9 pr-3 text-body text-ink placeholder:text-text-faint focus:border-ink focus:bg-card focus:outline-none"
      />
    </div>
  );
}
