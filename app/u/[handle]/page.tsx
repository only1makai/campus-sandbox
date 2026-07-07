import { notFound } from "next/navigation";
import AvatarUpload from "@/components/AvatarUpload";
import EditProfile from "@/components/EditProfile";
import NetworkStrip from "@/components/NetworkStrip";
import ShippedList from "@/components/ShippedList";
import { getCurrentUser, getProfileByHandle, getReputation } from "@/lib/identity";
import { fetchPostsByAuthor } from "@/lib/queries";

export const dynamic = "force-dynamic";

const BADGE_LABEL: Record<string, string> = {
  "karma-earner": "Karma earner",
  "slug-50": "Slug 50",
  "verified-contributor": "Verified contributor",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getProfileByHandle(decodeURIComponent(handle));
  if (!profile) notFound();

  const [reputation, currentUser, posts] = await Promise.all([
    getReputation(profile.id),
    getCurrentUser(),
    fetchPostsByAuthor(profile.id),
  ]);
  const isOwn = currentUser?.id === profile.id;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="rotate-[-1deg] rounded-card border-2 border-ink bg-card p-8 shadow-[4px_4px_0_#262014]">
        <div className="flex items-center gap-4">
          <AvatarUpload
            handle={profile.handle}
            avatarColor={profile.avatarColor}
            initialImageUrl={profile.avatarImageUrl ?? null}
            isOwn={isOwn}
          />

          <div>
            <h1 className="font-display text-heading text-ink">{profile.displayName}</h1>
            <p className="flex items-center gap-2 text-body text-text-secondary">
              @{profile.handle}
              {profile.verified && (
                <span className="rounded-full bg-live-green px-2 py-0.5 text-[11px] font-semibold text-white">
                  verified slug
                </span>
              )}
            </p>
            <p className="text-meta text-text-faint">UC Santa Cruz</p>
          </div>
        </div>

        {profile.bio ? (
          <p className="mt-4 text-body text-ink">{profile.bio}</p>
        ) : (
          <p className="mt-4 text-body italic text-text-faint">No bio yet.</p>
        )}

        {isOwn && <EditProfile initialBio={profile.bio ?? ""} />}

        {/* read-only platform reputation — display fact, never ranking */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rotate-[1deg] rounded-chip border-2 border-ink bg-gold px-3 py-1 font-display text-meta font-extrabold text-ink shadow-[2px_2px_0_#262014]">
            {reputation.totalKarma.toLocaleString()} karma
          </span>
          <span className="text-meta text-text-secondary">
            {reputation.verifiedKarma.toLocaleString()} verified ·{" "}
            {reputation.cosmeticKarma.toLocaleString()} cosmetic
          </span>
        </div>
        {reputation.badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {reputation.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border-2 border-ink bg-cream px-3 py-1 text-meta font-semibold text-ink"
              >
                {BADGE_LABEL[badge] ?? badge}
              </span>
            ))}
          </div>
        )}

        <NetworkStrip />

        <p className="mt-6 text-meta font-semibold uppercase tracking-[0.1em] text-text-faint">
          Shipped
        </p>
        <ShippedList posts={posts} />
      </div>
    </main>
  );
}
