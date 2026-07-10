import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/identity";
import AvatarUpload from "@/components/AvatarUpload";
import ProfileForm from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/profile");
  if (!user.profile) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
        <p className="text-body text-text-secondary">Setting up your profile…</p>
      </main>
    );
  }
  const profile = user.profile;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
      <Link
        href={`/u/${profile.handle}`}
        className="inline-flex items-center gap-1 text-meta font-semibold text-link-blue hover:underline"
      >
        <ArrowLeft size={14} /> Back to profile
      </Link>

      <h1 className="mt-3 font-display text-display text-ink">Edit profile</h1>

      <div className="mt-6 flex items-center gap-4">
        <AvatarUpload
          handle={profile.handle}
          avatarColor={profile.avatarColor}
          initialImageUrl={profile.avatarImageUrl ?? null}
          isOwn
        />
        <p className="text-meta text-text-secondary">
          Tap the camera to change your avatar. It saves as soon as you pick a file.
        </p>
      </div>

      <div className="mt-6">
        <ProfileForm profile={profile} />
      </div>
    </main>
  );
}
