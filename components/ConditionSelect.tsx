"use client";

import { CONDITIONS, CONDITION_DOT } from "@/lib/conditions";

/**
 * Thrift-only condition picker (5 tiers + "Not specified"). Condition is optional
 * — leaving it unset stores null and renders no badge, same as legacy thrift rows.
 * Dots match the card ConditionBadge so the vocabulary reads consistently.
 */
export default function ConditionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const options: { label: string; val: string; dot: string }[] = [
    { label: "Not specified", val: "", dot: "bg-border-soft" },
    ...CONDITIONS.map((c) => ({ label: c, val: c, dot: CONDITION_DOT[c] })),
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2 text-meta font-semibold text-ink">
        Condition
        <span className="rounded-full border border-ink bg-cream px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
          Thrift only
        </span>
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.val;
          return (
            <button
              key={o.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.val)}
              className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-meta font-semibold transition-colors ${
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/40 bg-cream text-ink hover:border-ink"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${o.dot}`} />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
