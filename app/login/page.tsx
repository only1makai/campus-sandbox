import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import { getCurrentUser } from "@/lib/identity";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <AuthCard />
    </main>
  );
}
