import { redirect } from "next/navigation";
import ShippedList from "@/components/ShippedList";
import { getCurrentUser } from "@/lib/identity";
import { fetchUpvotedPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function UpvotedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const posts = await fetchUpvotedPosts(user.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <p className="text-meta font-semibold uppercase tracking-[0.14em] text-text-faint">
        Campus Sandbox · UC Santa Cruz
      </p>
      <h1 className="mt-2 font-display text-display text-ink">Upvoted</h1>
      <p className="mt-1 text-body text-text-secondary">
        Apps and makers you&apos;ve given a boost of your own.
      </p>
      <div className="mt-8">
        <ShippedList posts={posts} emptyLabel="Nothing upvoted yet." />
      </div>
    </main>
  );
}
