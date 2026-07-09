export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="h-9 w-48 animate-pulse rounded-chip bg-border-soft" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-border-soft/70" />
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-card border-2 border-border-soft bg-card" />
        ))}
      </div>
    </main>
  );
}
