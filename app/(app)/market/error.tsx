"use client";

import FeedError from "@/components/FeedError";

export default function MarketError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <FeedError reset={reset} label="listings" />;
}
