/**
 * Chrome-free wrapper for public marketing surfaces (the landing page). No app
 * Header/Sidebar — the landing provides its own header and footer.
 */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
