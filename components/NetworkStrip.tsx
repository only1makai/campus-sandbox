/**
 * "Across the network" — a quiet, non-clickable strip. Not a nav item, not
 * a CTA: it just states that this identity carries across products.
 * Campus Sandbox is active; CAL-Links is greyed/dashed/coming-soon.
 */
export default function NetworkStrip() {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-chip border-2 border-dashed border-border-soft bg-cream px-4 py-2.5 text-meta">
      <span className="text-text-faint">One account carries across the network</span>
      <span className="flex items-center gap-1.5 text-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-live-green" />
        Campus Sandbox <span className="text-text-faint">· you&apos;re here</span>
      </span>
      <span className="flex items-center gap-1.5 rounded-chip border border-dashed border-text-faint px-2 py-0.5 text-text-faint">
        CAL-Links · coming soon
      </span>
    </div>
  );
}
