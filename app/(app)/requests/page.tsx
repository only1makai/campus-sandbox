import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/identity";
import { fetchMyRequests } from "@/lib/queries";
import SellerBadge from "@/components/SellerBadge";
import RequestStatusPill from "@/components/RequestStatusPill";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  app: "app",
  shop: "listing",
  thrift: "thrift find",
};

export default async function RequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/requests");

  const requests = await fetchMyRequests(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-display text-ink">Requests</h1>
      <p className="mt-1 text-body text-text-secondary">
        Your buyer and seller conversations. Threads are temporary and are removed after
        they&apos;re resolved.
      </p>

      {requests.length === 0 ? (
        <div className="mt-10 rounded-card border-2 border-dashed border-border-soft bg-cream p-10 text-center">
          <p className="font-display text-heading text-ink">No requests yet</p>
          <p className="mt-1 text-body text-text-secondary">
            Reach out to a seller from the Marketplace or Thrift to start a conversation.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/market"
              className="inline-flex items-center justify-center rounded-btn border-2 border-ink bg-gold px-4 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover"
            >
              Browse Marketplace
            </Link>
            <Link
              href="/thrift"
              className="inline-flex items-center justify-center rounded-btn border-2 border-ink bg-card px-4 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-paper"
            >
              Browse Thrift
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/requests/${r.id}`}
              className="flex items-center gap-3 rounded-card border-2 border-ink bg-card px-4 py-3 shadow-resting transition-shadow hover:shadow-elevated"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-chip border-2 border-ink bg-cream px-2 py-0.5 text-[11px] font-semibold text-ink">
                    {r.role === "buyer" ? "You're buying" : "You're selling"}
                  </span>
                  <RequestStatusPill status={r.status} />
                </div>
                <p className="mt-1.5 truncate font-display text-card-title text-ink">
                  {r.post.title}
                  <span className="ml-1 text-meta font-normal text-text-faint">
                    · {TYPE_LABEL[r.post.type] ?? r.post.type}
                  </span>
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <SellerBadge profile={r.counterpart} />
                  <span className="text-meta text-text-faint">
                    {r.messageCount} {r.messageCount === 1 ? "message" : "messages"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
