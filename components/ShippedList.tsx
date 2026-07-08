import type { Post, SupportingColor } from "@/types";
import BoostBadge from "@/components/BoostBadge";

const FILL: Record<SupportingColor, string> = {
  gold: "bg-gold",
  "live-green": "bg-live-green",
  "link-blue": "bg-link-blue",
  tomato: "bg-tomato",
  grape: "bg-grape",
};

function metaLine(post: Post): string {
  if (post.type === "app") {
    return `${post.platform === "ios" ? "iOS" : "Web"} · ${post.upvotes} upvotes · ${post.statusLabel}`;
  }
  return `$${(post.priceCents / 100).toFixed(0)} · ${post.upvotes} upvotes · ${post.locationLabel}`;
}

/** Compact post rows, reused across the profile page, Your ships, and
 *  Upvoted. Boosted badge only ever applies to product rows — reviews (the
 *  only verified-karma path) exist on market posts, never app posts. */
export default function ShippedList({
  posts,
  emptyLabel = "Nothing shipped yet.",
}: {
  posts: Post[];
  emptyLabel?: string;
}) {
  if (posts.length === 0) {
    return <p className="mt-2 text-body text-text-faint">{emptyLabel}</p>;
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {posts.map((post) => (
        <div
          key={post.id}
          className="flex items-center gap-3 rounded-btn border-2 border-ink bg-card px-3 py-2.5"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-chip border-2 border-ink text-sm font-bold text-white ${FILL[post.bannerColor]}`}
          >
            {post.title[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-display text-body font-bold text-ink">
              <span className="truncate">{post.title}</span>
              {post.type === "product" && (
                <BoostBadge post={post} placement="relative shadow-none px-1.5" />
              )}
            </p>
            <p className="truncate text-meta text-text-secondary">{metaLine(post)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
