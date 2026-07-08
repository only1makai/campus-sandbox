"use client";

/**
 * Route-level error boundary: catches server-side failures (bad env values,
 * unreachable database, query errors) and renders a readable, on-brand
 * message instead of a blank crash.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-card border-2 border-ink bg-card p-8 text-center shadow-resting">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-chip border-2 border-ink bg-tomato text-3xl shadow-resting">
          🐌
        </span>
        <h1 className="mt-4 font-display text-heading text-ink">
          The sandbox slipped
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          Something went wrong talking to the database. If you run this app,
          check the server logs and your <code>.env.local</code> values.
        </p>
        {error.digest && (
          <p className="mt-1 text-meta text-text-faint">error digest: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-btn border-2 border-ink bg-gold px-4 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover active:bg-gold-active"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
