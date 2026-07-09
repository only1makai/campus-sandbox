import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/identity";
import { fetchMyRating, fetchRequestThread } from "@/lib/queries";
import SellerBadge from "@/components/SellerBadge";
import RequestStatusPill from "@/components/RequestStatusPill";
import MessageComposer from "@/components/MessageComposer";
import RequestActions from "@/components/RequestActions";
import RatingPrompt from "@/components/RatingPrompt";

export const dynamic = "force-dynamic";

const MESSAGE_CAP = 20;

export default async function RequestThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/requests/${id}`);

  const thread = await fetchRequestThread(id, user.id);

  // Null = no such request OR the viewer isn't a participant (RLS returned zero
  // rows). Both render the same not-found — a third party sees nothing.
  if (!thread) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-card border-2 border-ink bg-card p-8 text-center shadow-resting">
          <h1 className="font-display text-heading text-ink">Request not found</h1>
          <p className="mt-2 text-body text-text-secondary">
            This request doesn&apos;t exist, or you&apos;re not part of it.
          </p>
          <Link
            href="/requests"
            className="mt-4 inline-flex items-center justify-center rounded-btn border-2 border-ink bg-gold px-4 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover"
          >
            Back to requests
          </Link>
        </div>
      </main>
    );
  }

  const counterpart = thread.myRole === "buyer" ? thread.seller : thread.buyer;
  const closed = thread.status === "declined" || thread.status === "expired";
  const atCap = thread.messages.length >= MESSAGE_CAP;
  const nearCap = thread.messages.length >= MESSAGE_CAP - 5;
  const myRating =
    thread.myRole === "buyer" && thread.status === "fulfilled"
      ? await fetchMyRating(thread.id)
      : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-8">
      <Link
        href="/requests"
        className="inline-flex items-center gap-1 text-meta font-semibold text-link-blue hover:underline"
      >
        <ArrowLeft size={14} />
        All requests
      </Link>

      {/* thread header */}
      <div className="mt-3 rounded-card border-2 border-ink bg-card p-4 shadow-resting">
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 truncate font-display text-heading text-ink">
            {thread.post.title}
          </h1>
          <RequestStatusPill status={thread.status} />
        </div>
        <div className="mt-2 flex items-center gap-2 text-meta text-text-secondary">
          <span>{thread.myRole === "buyer" ? "Seller:" : "Buyer:"}</span>
          <SellerBadge profile={counterpart} />
        </div>
      </div>

      {/* ephemerality note — calm, informative */}
      <p className="mt-3 text-meta text-text-faint">
        Request threads are temporary and are removed after they&apos;re resolved.
      </p>

      {/* messages */}
      <div className="mt-3 flex flex-1 flex-col gap-2">
        {thread.messages.length === 0 ? (
          <p className="text-body text-text-faint">No messages yet.</p>
        ) : (
          thread.messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-card border-2 border-ink px-3 py-2 shadow-resting ${
                  m.mine ? "bg-gold text-ink" : "bg-cream text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap break-words text-body">{m.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* message count indicator (approaching the 20 cap) */}
      <p
        className={`mt-3 text-meta ${nearCap ? "font-semibold text-tomato" : "text-text-faint"}`}
      >
        {thread.messages.length}/{MESSAGE_CAP} messages
      </p>

      {/* composer */}
      <div className="mt-2">
        <MessageComposer requestId={thread.id} closed={closed} atCap={atCap} />
      </div>

      {/* seller actions on an open request */}
      {thread.myRole === "seller" && thread.status === "open" && (
        <div className="mt-4">
          <RequestActions requestId={thread.id} />
        </div>
      )}

      {/* buyer rating once fulfilled */}
      {thread.myRole === "buyer" && thread.status === "fulfilled" && (
        <div className="mt-4">
          <RatingPrompt requestId={thread.id} existingRating={myRating} />
        </div>
      )}
    </main>
  );
}
