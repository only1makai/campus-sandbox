import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/identity";

/**
 * App chrome (Header + Sidebar) for every signed-in surface. Lives in the
 * (app) route group so the (marketing) landing can render chrome-free at the
 * same "/" URL (middleware rewrites logged-out "/" → "/landing").
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <>
      <Header user={user} />
      <div className="flex min-h-0 flex-1">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </>
  );
}
