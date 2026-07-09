import BetaBoard from "@/components/BetaBoard";
import { fetchApps } from "@/lib/queries";
import { getCurrentUser } from "@/lib/identity";

// Live board — always render from the database, never a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [apps, user] = await Promise.all([fetchApps(), getCurrentUser()]);
  return <BetaBoard apps={apps} isAuthed={user !== null} />;
}
