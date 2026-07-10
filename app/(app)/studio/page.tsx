import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, MessageSquare, Sparkles, Users, ShoppingBag } from "lucide-react";
import { getCurrentUser } from "@/lib/identity";
import {
  fetchMakerFeedback,
  fetchMyRequests,
  fetchPostsByAuthor,
  fetchStudioSummary,
  getSellerRating,
} from "@/lib/queries";
import type { Post } from "@/types";
import ActivityChart from "@/components/ActivityChart";
import ReplyBox from "@/components/ReplyBox";
import SellerBadge from "@/components/SellerBadge";

export const dynamic = "force-dynamic";

function boostDaysLeft(post: Post): number | null {
  if (!post.boostExpiresAt) return null;
  const ms = Date.parse(post.boostExpiresAt) - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : null;
}

function chips(post: Post): { label: string; cls: string }[] {
  const out: { label: string; cls: string }[] = [];
  const boost = boostDaysLeft(post);
  if (boost) out.push({ label: `Boosted · ${boost}d left`, cls: "bg-gold text-ink" });
  if (post.type === "app") {
    out.push({ label: "Live", cls: "bg-live-green text-white" });
    if (post.testerGoal != null && post.testerCount < post.testerGoal) {
      out.push({ label: `Needs ${post.testerGoal - post.testerCount} testers`, cls: "bg-cream text-ink border-2 border-ink" });
    }
  } else if (post.type === "thrift") {
    if (post.status === "sold") out.push({ label: "Sold", cls: "bg-ink text-paper" });
    else if (post.status === "expired") out.push({ label: "Expired", cls: "bg-border-soft text-text-secondary" });
    else if (post.expiresAt) {
      const d = Math.max(0, Math.ceil((Date.parse(post.expiresAt) - Date.now()) / 86_400_000));
      out.push({ label: `${d}d left`, cls: "bg-cream text-ink border-2 border-ink" });
    }
  } else {
    out.push({ label: post.statusLabel || "In stock", cls: "bg-live-green text-white" });
  }
  return out;
}

export default async function StudioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/studio");

  const [summary, ships, requests, feedback, rating] = await Promise.all([
    fetchStudioSummary(),
    fetchPostsByAuthor(user.id),
    fetchMyRequests(user.id),
    fetchMakerFeedback(user.id),
    getSellerRating(user.id),
  ]);

  const openReqs = requests
    .filter((r) => r.role === "seller" && r.status === "open")
    .sort((a, b) => Date.parse(a.lastActivityAt) - Date.parse(b.lastActivityAt));
  const liveApps = ships.filter((s) => s.type === "app").length;
  const boosts = ships.filter((s) => boostDaysLeft(s)).length;
  const name = user.profile?.displayName ?? "slug";

  const stats = [
    { icon: Sparkles, label: "Karma from testers", value: summary.karmaFromTestersWeek, hint: "this week" },
    { icon: Users, label: "New testers", value: summary.newTestersWeek, hint: "this week" },
    { icon: ShoppingBag, label: "Fulfilled sales", value: rating.count, hint: "rated pickups" },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="font-display text-display text-ink">Welcome back, {name}</h1>
      <p className="mt-1 text-body text-text-secondary">
        {liveApps} {liveApps === 1 ? "app" : "apps"} live · {boosts} {boosts === 1 ? "boost" : "boosts"} running
      </p>

      {/* stat cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-card border-2 border-ink bg-card p-5 shadow-resting">
              <span className="flex h-9 w-9 items-center justify-center rounded-chip border-2 border-ink bg-gold text-ink shadow-resting">
                <Icon size={18} />
              </span>
              <p className="mt-3 font-display text-heading text-ink">{s.value.toLocaleString()}</p>
              <p className="text-meta font-semibold text-ink">{s.label}</p>
              <p className="text-meta text-text-faint">{s.hint}</p>
            </div>
          );
        })}
      </div>

      {/* request inbox — most prominent */}
      <section className="mt-8 rounded-card border-2 border-ink bg-card p-6 shadow-resting">
        <h2 className="flex items-center gap-2 font-display text-heading text-ink">
          <Inbox size={20} /> Request inbox
        </h2>
        <p className="mt-1 text-meta text-text-secondary">Open requests on your listings, oldest first.</p>
        {openReqs.length === 0 ? (
          <p className="mt-4 text-body text-text-faint">No open requests. You&apos;re all caught up.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {openReqs.map((r) => (
              <Link
                key={r.id}
                href={`/requests/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-card border-2 border-ink bg-cream px-4 py-3 transition-shadow hover:shadow-elevated"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-card-title text-ink">{r.post.title}</p>
                  <div className="mt-1 flex items-center gap-3">
                    <SellerBadge profile={r.counterpart} />
                    <span className="text-meta text-text-faint">{r.messageCount} messages</span>
                  </div>
                </div>
                <span className="shrink-0 text-meta font-semibold text-link-blue">Open →</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* your ships */}
      <section className="mt-8">
        <h2 className="font-display text-heading text-ink">Your ships</h2>
        {ships.length === 0 ? (
          <p className="mt-2 text-body text-text-faint">Nothing shipped yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {ships.map((post) => (
              <div key={post.id} className="flex items-center justify-between gap-3 rounded-card border-2 border-ink bg-card px-4 py-3 shadow-resting">
                <div className="min-w-0">
                  <p className="truncate font-display text-card-title text-ink">{post.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {chips(post).map((c) => (
                      <span key={c.label} className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.cls}`}>
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/studio/${post.id}`}
                  className="shrink-0 rounded-btn border-2 border-ink bg-card px-3 py-1.5 text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-paper"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* feedback inbox */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-display text-heading text-ink">
          <MessageSquare size={20} /> Feedback
        </h2>
        {feedback.length === 0 ? (
          <p className="mt-2 text-body text-text-faint">No feedback yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {feedback.map((f) => (
              <div key={f.id} className="rounded-card border-2 border-ink bg-card p-4 shadow-resting">
                <div className="flex items-center justify-between gap-2">
                  <SellerBadge profile={f.reviewer} />
                  <span className="text-meta text-text-faint">on {f.postTitle}</span>
                </div>
                <p className="mt-2 text-body text-ink">{f.body}</p>
                <ReplyBox reviewId={f.id} existingReply={f.reply} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* activity chart */}
      <section className="mt-8 rounded-card border-2 border-ink bg-card p-6 shadow-resting">
        <h2 className="font-display text-heading text-ink">Activity</h2>
        <p className="mt-1 text-meta text-text-secondary">Upvotes and tester-joins, last 8 weeks.</p>
        <ActivityChart data={summary.activity} />
      </section>
    </main>
  );
}
