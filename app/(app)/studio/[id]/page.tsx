import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getCurrentUser } from "@/lib/identity";
import { fetchMakerFeedback, fetchPostById } from "@/lib/queries";
import type { Post } from "@/types";
import ReplyBox from "@/components/ReplyBox";
import SellerBadge from "@/components/SellerBadge";
import VersionEditor from "@/components/VersionEditor";

export const dynamic = "force-dynamic";

function publicHref(post: Post): string {
  if (post.type === "shop") return "/market";
  if (post.type === "thrift") return "/thrift";
  return "/";
}

function boostDaysLeft(post: Post): number | null {
  if (!post.boostExpiresAt) return null;
  const ms = Date.parse(post.boostExpiresAt) - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : null;
}

export default async function ShipManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/studio/${id}`);

  const post = await fetchPostById(id);
  if (!post || post.author.id !== user.id) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-card border-2 border-ink bg-card p-8 text-center shadow-resting">
          <h1 className="font-display text-heading text-ink">Not your listing</h1>
          <p className="mt-2 text-body text-text-secondary">
            This listing doesn&apos;t exist, or you don&apos;t own it.
          </p>
          <Link
            href="/studio"
            className="mt-4 inline-flex items-center justify-center rounded-btn border-2 border-ink bg-gold px-4 py-2 text-meta font-semibold text-ink shadow-resting"
          >
            Back to Studio
          </Link>
        </div>
      </main>
    );
  }

  const feedback = (await fetchMakerFeedback(user.id)).filter((f) => f.postId === id);
  const boost = boostDaysLeft(post);
  const isApp = post.type === "app";
  const capFull = isApp && post.maxTesters != null && post.testerCount >= post.maxTesters;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <Link
        href="/studio"
        className="inline-flex items-center gap-1 text-meta font-semibold text-link-blue hover:underline"
      >
        <ArrowLeft size={14} /> Studio
      </Link>

      <div className="mt-3 rounded-card border-2 border-ink bg-card p-6 shadow-resting">
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 truncate font-display text-heading text-ink">{post.title}</h1>
          <Link
            href={publicHref(post)}
            className="flex shrink-0 items-center gap-1 text-meta font-semibold text-link-blue hover:underline"
          >
            View public page <ExternalLink size={13} />
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-cream px-2.5 py-0.5 text-[11px] font-semibold text-ink">{post.type}</span>
          {boost && (
            <span className="rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-semibold text-ink">
              Boosted · {boost}d left
            </span>
          )}
          {capFull && (
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-paper">Beta full</span>
          )}
        </div>
      </div>

      {/* app-only: version/changelog + tester cohort */}
      {isApp && (
        <>
          <section className="mt-6 rounded-card border-2 border-ink bg-card p-6 shadow-resting">
            <h2 className="font-display text-card-title text-ink">Tester cohort</h2>
            <p className="mt-1 text-body text-text-secondary">
              {post.testerCount} joined
              {post.testerGoal != null && ` · goal ${post.testerGoal}`}
              {post.maxTesters != null && ` · cap ${post.maxTesters}`}
            </p>
            {post.testerGoal != null && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border-soft">
                <div
                  className="h-full rounded-full bg-gold"
                  style={{ width: `${Math.min(100, (post.testerCount / post.testerGoal) * 100)}%` }}
                />
              </div>
            )}
          </section>

          <section className="mt-6 rounded-card border-2 border-ink bg-card p-6 shadow-resting">
            <h2 className="font-display text-card-title text-ink">Version &amp; changelog</h2>
            <div className="mt-3">
              <VersionEditor
                postId={post.id}
                version={post.version ?? null}
                changelog={post.changelog ?? null}
                testerGoal={post.testerGoal ?? null}
                maxTesters={post.maxTesters ?? null}
              />
            </div>
          </section>
        </>
      )}

      {/* feedback + reply */}
      <section className="mt-6">
        <h2 className="font-display text-card-title text-ink">Feedback</h2>
        {feedback.length === 0 ? (
          <p className="mt-2 text-body text-text-faint">No feedback yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {feedback.map((f) => (
              <div key={f.id} className="rounded-card border-2 border-ink bg-card p-4 shadow-resting">
                <SellerBadge profile={f.reviewer} />
                <p className="mt-2 text-body text-ink">{f.body}</p>
                <ReplyBox reviewId={f.id} existingReply={f.reply} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
