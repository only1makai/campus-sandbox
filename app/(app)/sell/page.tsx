"use client";

import { useState } from "react";
import { Store, Tag, Check } from "lucide-react";
import SellForm from "@/components/SellForm";

type Choice = "shop" | "thrift";

const OPTIONS: {
  key: Choice;
  icon: typeof Store;
  title: string;
  points: string[];
}[] = [
  {
    key: "shop",
    icon: Store,
    title: "Open a listing in my storefront",
    points: [
      "Recurring — it stays up while you keep selling it.",
      "Buyers can review you, and good reviews can boost your ranking.",
      "Best for makers with an ongoing thing.",
    ],
  },
  {
    key: "thrift",
    icon: Tag,
    title: "Sell something once",
    points: [
      "One-time — it expires in about 21 days.",
      "No reviews and no ranking; the feed just shows newest first.",
      "Best for clearing out used goods.",
    ],
  },
];

export default function SellPage() {
  const [choice, setChoice] = useState<Choice | null>(null);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-display text-ink">Start selling</h1>
      <p className="mt-1 text-body text-text-secondary">
        Two ways to sell on campus. Pick the one that fits — you can&apos;t change it later.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = choice === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setChoice(opt.key)}
              className={`flex flex-col gap-3 rounded-card border-2 p-5 text-left shadow-resting transition-shadow hover:shadow-elevated ${
                selected ? "border-ink bg-cream" : "border-border-soft bg-card hover:border-ink"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-chip border-2 border-ink bg-gold text-ink shadow-resting">
                <Icon size={20} />
              </span>
              <span className="font-display text-card-title text-ink">{opt.title}</span>
              <ul className="flex flex-col gap-1.5">
                {opt.points.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-meta text-text-secondary">
                    <Check size={14} className="mt-0.5 shrink-0 text-gold-active" />
                    {p}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {choice && <SellForm key={choice} type={choice} />}
    </main>
  );
}
