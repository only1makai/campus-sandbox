import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import { getCurrentUser } from "@/lib/identity";
import { safeInternalPath } from "@/lib/redirect";

/** Contextual sub-heading per known deep-link destination; unknown → none. */
const CONTEXT_LINE: Record<string, string> = {
  "/market": "Sign in to enter the Marketplace",
  "/": "Sign in to explore the Beta Board",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: rawNext } = await searchParams;
  const next = safeInternalPath(rawNext);

  const user = await getCurrentUser();
  if (user) redirect(next);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <AuthCard next={next} contextLine={CONTEXT_LINE[next]} />
    </main>
  );
}
