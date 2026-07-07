import { notFound } from "next/navigation";
import EditProfile from "@/components/EditProfile";
import { getCurrentUser, getProfileByHandle, getReputation } from "@/lib/identity";
import type { SupportingColor } from "@/lib/identity";

export const dynamic = "force-dynamic";

const FILL: Record<SupportingColor, string> = {
  gold: "bg-gold",
  "live-green": "bg-live-green",
  "link-blue": "bg-link-blue",
  tomato: "bg-tomato",
  grape: "bg-grape",
};

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

  const [reputation, currentUser] = await Promise.all([
    getReputation(profile.id),
    getCurrentUser(),
  ]);
  const isOwn = currentUser?.id === profile.id;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="rotate-[-1deg] rounded-card border-2 border-ink bg-card p-8 shadow-[4px_4px_0_#262014]">
        <div className="flex items-center gap-4">
          {/* avatar: image if set, flat color fallback */}
          {profile.avatarImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote host list unknown for MVP
            <img
              src={profile.avatarImageUrl}
              alt={`@${profile.handle} avatar`}
              className="h-20 w-20 rotate-[2deg] rounded-chip border-2 border-ink object-cover shadow-[2px_2px_0_#262014]"
            />
          ) : (
            <span
              className={`flex h-20 w-20 rotate-[2deg] items-center justify-center rounded-chip border-2 border-ink font-display text-4xl font-extrabold text-white shadow-[2px_2px_0_#262014] ${FILL[profile.avatarColor]}`}
            >
              {profile.handle[0].toUpperCase()}
            </span>
          )}

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

        {profile.bio && <p className="mt-4 text-body text-ink">{profile.bio}</p>}

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

        {isOwn && (
          <EditProfile
            initialBio={profile.bio ?? ""}
            initialAvatarImageUrl={profile.avatarImageUrl ?? ""}
          />
        )}
      </div>
    </main>
  );
}
