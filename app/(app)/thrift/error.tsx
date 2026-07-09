"use client";

import FeedError from "@/components/FeedError";

export default function ThriftError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <FeedError reset={reset} label="thrift" />;
}
