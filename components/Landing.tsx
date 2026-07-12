import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { AppPost, MarketPost, Post, SellerRating } from "@/types";
import AppCard from "@/components/AppCard";
import MakerCard from "@/components/MakerCard";
import ShippedList from "@/components/ShippedList";

/**
 * Public landing page (logged-out "/"). Previews REAL posts read-only and
 * funnels every CTA through /login?next=<dest>. Chrome-free — rendered under the
 * (marketing) layout. Reuses design tokens/motion; adds ~zero new constants.
 */
export default function Landing({
  apps,
  market,
  ratings,
  makerRows,
  contactEmail,
  loggedIn = false,
}: {
  apps: AppPost[];
  market: MarketPost[];
  /** seller star aggregates keyed by author id (shop cards only) */
  ratings: Record<string, SellerRating>;
  makerRows: Post[];
  contactEmail: string;
  /** the marketing page is reachable by signed-in users too (header wordmark) */
  loggedIn?: boolean;
}) {
  // Logged-in visitors go straight to the real destination; logged-out ones
  // route through login carrying the intent.
  const dest = (d: string) => (loggedIn ? d : `/login?next=${d}`);

  return (
    <div className="min-h-full bg-paper">
      {/* header — wordmark + a single auth-aware CTA, no nav */}
      <header className="flex items-center justify-between border-b-2 border-ink bg-cream px-6 py-4">
        <Link href="/landing" className="rounded-chip border-2 border-ink bg-card px-3 py-1 font-display text-meta font-extrabold tracking-wide text-ink shadow-resting">
          CAMPUS SANDBOX
        </Link>
        <Link
          href={loggedIn ? "/" : "/login"}
          className="rounded-btn border-2 border-ink bg-gold px-4 py-1.5 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover"
        >
          {loggedIn ? "Back to app" : "Log in"}
        </Link>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-card px-3 py-1 font-sans text-meta font-semibold text-ink shadow-resting">
          <ShieldCheck size={13} />
          UCSC students only · @ucsc.edu
        </span>
        <h1 className="mt-6 font-display text-display text-ink">Welcome to the Sandbox</h1>
        <p className="mx-auto mt-3 max-w-xl text-body text-text-secondary">
          Student-built apps and student-made goods, from your fellow Slugs.
        </p>
      </section>

      {/* §1 — Shop student-made (real Marketplace + Thrift, read-only) */}
      <Section
        title="Shop student-made"
        supporting="Ceramics, stickers, secondhand finds — bought and sold by Slugs on campus."
        ctaLabel="Enter the Marketplace →"
        ctaHref={dest("/market")}
      >
        {market.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {market.map((product, i) => (
              <MakerCard
                key={product.id}
                product={product}
                index={i}
                isAuthed={false}
                readOnly
                rating={product.type === "shop" ? ratings[product.author.id] : undefined}
              />
            ))}
          </div>
        )}
      </Section>

      {/* §2 — Test what's next (real Beta Board apps, read-only) */}
      <Section
        title="Test what's next"
        supporting="Apps shipped by student builders, looking for their first testers."
        ctaLabel="Browse the Beta Board →"
        ctaHref={dest("/")}
      >
        {apps.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} isAuthed={false} readOnly />
            ))}
          </div>
        )}
      </Section>

      {/* §3 — Launch your thing (real maker/seller rows, read-only) */}
      <Section
        title="Launch your thing"
        supporting="Ship an app or sell your goods — your @ucsc.edu is all it takes to start."
        ctaLabel="Start creating →"
        ctaHref={dest("/sell")}
      >
        {makerRows.length > 0 && <ShippedList posts={makerRows} />}
      </Section>

      {/* footer */}
      <footer className="mt-8 border-t-2 border-ink bg-cream px-6 py-10 text-center">
        <span className="text-3xl" role="img" aria-label="banana slug">
          🐌
        </span>
        <p className="mt-2 text-body text-text-secondary">
          Campus Sandbox — open to verified UCSC students only
        </p>
        <a
          href={`mailto:${contactEmail}`}
          className="mt-1 inline-block text-meta font-semibold text-link-blue hover:underline"
        >
          {contactEmail}
        </a>
      </footer>
    </div>
  );
}

function Section({
  title,
  supporting,
  ctaLabel,
  ctaHref,
  children,
}: {
  title: string;
  supporting: string;
  ctaLabel: string;
  ctaHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <h2 className="font-display text-heading text-ink">{title}</h2>
      <p className="mt-1 text-body text-text-secondary">{supporting}</p>
      <div className="mt-6">{children}</div>
      <div className="mt-8">
        <Link
          href={ctaHref}
          className="flex w-full items-center justify-center rounded-btn border-2 border-ink bg-gold px-5 py-2.5 font-sans text-body font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover sm:inline-flex sm:w-auto"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
