import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, ExternalLink } from "lucide-react";
import AvatarUpload from "@/components/AvatarUpload";
import ShippedList from "@/components/ShippedList";
import RatingStars from "@/components/RatingStars";
import { getCurrentUser, getProfileByHandle, getReputation } from "@/lib/identity";
import { fetchBetasTested, fetchPostsByAuthor, getSellerRating } from "@/lib/queries";

export const dynamic = "force-dynamic";

const BADGE_LABEL: Record<string, string> = {
  "karma-earner": "Karma earner",
  "slug-50": "Slug 50",
  "verified-contributor": "Verified contributor",
};

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getProfileByHandle(decodeURIComponent(handle));
  if (!profile) notFound();

  const [reputation, currentUser, posts, rating, betas] = await Promise.all([
    getReputation(profile.id),
    getCurrentUser(),
    fetchPostsByAuthor(profile.id),
    getSellerRating(profile.id),
    fetchBetasTested(profile.id),
  ]);
  const isOwn = currentUser?.id === profile.id;

  const apps = posts.filter((p) => p.type === "app");
  const selling = posts.filter((p) => p.type === "shop" || p.type === "thrift");

  const stats = [
    { label: posts.length === 1 ? "ship" : "ships", value: posts.length.toLocaleString() },
    { label: "karma", value: reputation.totalKarma.toLocaleString() },
    { label: betas === 1 ? "beta tested" : "betas tested", value: betas.toLocaleString() },
    { label: "seller rating", value: rating.count > 0 ? `${rating.avg?.toFixed(1)}★` : "—" },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="rounded-card border-2 border-ink bg-card p-8 shadow-resting">
        <div className="flex items-start gap-4">
          <AvatarUpload
            handle={profile.handle}
            avatarColor={profile.avatarColor}
            initialImageUrl={profile.avatarImageUrl ?? null}
            isOwn={isOwn}
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 truncate font-display text-heading text-ink">
                {profile.displayName}
              </h1>
              {profile.collegeYear && (
                <span className="shrink-0 rounded-chip border-2 border-ink bg-cream px-2.5 py-0.5 text-meta font-semibold text-ink">
                  {profile.collegeYear}
                </span>
              )}
            </div>
            <p className="flex flex-wrap items-center gap-2 text-body text-text-secondary">
              @{profile.handle}
              {profile.pronouns && <span className="text-text-faint">· {profile.pronouns}</span>}
              {profile.verified && (
                <span className="rounded-full bg-live-green px-2 py-0.5 text-[11px] font-semibold text-white">
                  verified slug
                </span>
              )}
            </p>
          </div>
          {isOwn && (
            <Link
              href="/settings/profile"
              className="shrink-0 rounded-btn border-2 border-ink bg-card px-3 py-1.5 text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-paper"
            >
              Edit profile
            </Link>
          )}
        </div>

        {profile.bio ? (
          <p className="mt-4 text-body text-ink">{profile.bio}</p>
        ) : (
          <p className="mt-4 text-body italic text-text-faint">No bio yet.</p>
        )}

        {/* links */}
        {(profile.githubUrl || profile.websiteUrl || profile.contactEmail) && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-meta font-semibold text-link-blue">
            {profile.githubUrl && (
              <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                <ExternalLink size={14} /> GitHub
              </a>
            )}
            {profile.websiteUrl && (
              <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                <Globe size={14} /> Website
              </a>
            )}
            {profile.contactEmail && (
              <a href={`mailto:${profile.contactEmail}`} className="flex items-center gap-1 hover:underline">
                <ExternalLink size={14} /> Email
              </a>
            )}
          </div>
        )}

        {/* stat row */}
        <div className="mt-5 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-card border-2 border-border-soft bg-cream px-2 py-3 text-center">
              <p className="font-display text-card-title text-ink">{s.value}</p>
              <p className="text-[11px] text-text-faint">{s.label}</p>
            </div>
          ))}
        </div>

        {/* karma milestone badges (kept — milestone badges are allowed) */}
        {reputation.badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {reputation.badges.map((badge) => (
              <span key={badge} className="rounded-full border-2 border-ink bg-cream px-3 py-1 text-meta font-semibold text-ink">
                {BADGE_LABEL[badge] ?? badge}
              </span>
            ))}
          </div>
        )}

        <p className="mt-6 text-meta font-semibold uppercase tracking-[0.1em] text-text-faint">Ships</p>
        <ShippedList posts={apps} emptyLabel="No apps shipped yet." />

        <div className="mt-6 flex items-center justify-between">
          <p className="text-meta font-semibold uppercase tracking-[0.1em] text-text-faint">Selling</p>
          {rating.count > 0 && <RatingStars avg={rating.avg} count={rating.count} />}
        </div>
        <ShippedList posts={selling} emptyLabel="Nothing for sale yet." />
      </div>
    </main>
  );
}
