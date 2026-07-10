import type { StudioActivityWeek } from "@/types";

/** Read-only 8-week activity: upvotes (ink) + tester-joins (gold) per week,
 *  from karma_ledger via studio_summary. Div-based so it stays responsive. */
export default function ActivityChart({ data }: { data: StudioActivityWeek[] }) {
  if (data.length === 0) {
    return <p className="mt-2 text-body text-text-faint">No activity yet.</p>;
  }
  const max = Math.max(1, ...data.flatMap((d) => [d.upvotes, d.testers]));

  return (
    <div>
      <div className="mt-2 flex h-32 items-end gap-2">
        {data.map((d) => (
          <div key={d.week} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end justify-center gap-1">
              <div
                className="w-2.5 rounded-t bg-ink"
                style={{ height: `${(d.upvotes / max) * 100}%` }}
                title={`${d.upvotes} upvotes`}
              />
              <div
                className="w-2.5 rounded-t bg-gold"
                style={{ height: `${(d.testers / max) * 100}%` }}
                title={`${d.testers} tester-joins`}
              />
            </div>
            <span className="text-[10px] text-text-faint">{d.week.slice(5)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-meta text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-ink" /> Upvotes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-gold" /> Tester-joins
        </span>
      </div>
    </div>
  );
}
