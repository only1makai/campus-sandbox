"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { SupportingColor } from "@/types";
import { createListing } from "@/app/actions/posts";
import { FILL } from "@/lib/colors";
import { tapPress, transitionFast } from "@/lib/motion";
import ListingImageUploader from "@/components/ListingImageUploader";
import ConditionSelect from "@/components/ConditionSelect";

/** Category allowlists mirror create_post (migration 015) exactly. */
const CATEGORIES: Record<"shop" | "thrift", string[]> = {
  shop: [
    "ceramics", "apparel", "prints", "stickers", "jewelry", "plants", "flowers",
    "candles", "fiber", "art", "food", "service", "other",
  ],
  thrift: ["furniture", "electronics", "textbooks", "clothing", "kitchen", "decor", "bikes", "other"],
};
const COLORS: SupportingColor[] = ["gold", "live-green", "link-blue", "tomato", "grape"];

const inputClass =
  "w-full rounded-btn border-2 border-ink bg-cream px-3 py-2 text-body text-ink placeholder:text-text-faint focus:outline-none focus:bg-card";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-meta font-semibold text-ink">{label}</span>
      {children}
      {error && <span className="text-meta font-semibold text-tomato">{error}</span>}
    </label>
  );
}

/**
 * Listing form for the /sell fork. `type` is baked from the chosen fork.
 * Client-side validation mirrors create_post for fast feedback, but the RPC
 * remains the enforcement — every rule here is re-checked server-side.
 */
export default function SellForm({ type }: { type: "shop" | "thrift" }) {
  const router = useRouter();
  const cats = CATEGORIES[type];
  const descMax = type === "shop" ? 600 : 280;
  const maxImages = type === "shop" ? 3 : 1;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(cats[0]);
  const [location, setLocation] = useState("");
  const [bannerColor, setBannerColor] = useState<SupportingColor>("gold");
  const [images, setImages] = useState<string[]>([]);
  const [condition, setCondition] = useState("");
  // groups this draft's uploaded photos under one Storage folder
  const [token] = useState(() => crypto.randomUUID());
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  const priceCents = Math.round(parseFloat(price) * 100);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    const t = title.trim();
    if (t.length < 2 || t.length > 80) e.title = "Title must be 2–80 characters.";
    const d = description.trim();
    if (d.length < 3 || d.length > descMax) e.description = `Description must be 3–${descMax} characters.`;
    if (!Number.isFinite(priceCents) || priceCents < 1 || priceCents > 1_000_000) {
      e.price = "Price must be between $0.01 and $10,000.";
    }
    if (!cats.includes(category)) e.category = "Pick a category.";
    const l = location.trim();
    if (l.length < 2 || l.length > 60) e.location = "Location must be 2–60 characters.";
    return e;
  }

  const submit = () => {
    setError(null);
    const e = validate();
    setFieldErr(e);
    if (Object.keys(e).length > 0) return;

    startT(async () => {
      const result = await createListing({
        type,
        title: title.trim(),
        description: description.trim(),
        priceCents,
        category,
        location: location.trim(),
        bannerColor,
        imageUrls: images,
        condition: type === "thrift" ? condition || null : null,
      });
      if (!result.ok) {
        if (result.reason === "auth_required") {
          router.push("/login?next=/sell");
          return;
        }
        setError(result.message ?? "Something went wrong.");
        return;
      }
      router.push(type === "shop" ? "/market" : "/thrift");
    });
  };

  return (
    <form
      className="mt-6 flex flex-col gap-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        submit();
      }}
    >
      <ListingImageUploader max={maxImages} token={token} value={images} onChange={setImages} />

      <Field label="Title" error={fieldErr.title}>
        <input
          className={inputClass}
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === "shop" ? "e.g. Hand-thrown ceramic mugs" : "e.g. Mini fridge, works great"}
        />
      </Field>

      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between text-meta font-semibold text-ink">
          Description
          <span className="font-normal text-text-faint">
            {description.length}/{descMax}
          </span>
        </span>
        <textarea
          className={inputClass}
          value={description}
          rows={type === "shop" ? 4 : 3}
          maxLength={descMax}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is it, condition, anything a buyer should know."
        />
        {fieldErr.description && (
          <span className="text-meta font-semibold text-tomato">{fieldErr.description}</span>
        )}
      </label>

      {type === "thrift" && <ConditionSelect value={condition} onChange={setCondition} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price (USD)" error={fieldErr.price}>
          <div className="flex items-center gap-2 rounded-btn border-2 border-ink bg-cream px-3 focus-within:bg-card">
            <span className="text-body font-semibold text-text-secondary">$</span>
            <input
              className="w-full bg-transparent py-2 text-body text-ink placeholder:text-text-faint focus:outline-none"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="18.00"
            />
          </div>
        </Field>

        <Field label="Category" error={fieldErr.category}>
          <select
            className={`${inputClass} cursor-pointer`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {cats.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={type === "shop" ? "Pickup / location" : "Pickup location"} error={fieldErr.location}>
        <input
          className={inputClass}
          value={location}
          maxLength={60}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Quarry Plaza"
        />
      </Field>

      <div className="flex flex-col gap-1">
        <span className="text-meta font-semibold text-ink">Card color</span>
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={bannerColor === c}
              onClick={() => setBannerColor(c)}
              className={`h-9 w-9 rounded-chip border-2 ${FILL[c]} ${
                bannerColor === c ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-paper" : "border-ink/40"
              }`}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-chip border-2 border-ink bg-tomato px-3 py-2 text-meta font-semibold text-white">
          {error}
        </p>
      )}

      <motion.button
        type="submit"
        disabled={busy}
        whileTap={tapPress}
        transition={transitionFast}
        className="mt-1 rounded-btn border-2 border-ink bg-gold px-4 py-2.5 font-sans text-body font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover active:bg-gold-active disabled:opacity-60"
      >
        {busy ? "Posting…" : type === "shop" ? "Post to Marketplace" : "Post to Thrift"}
      </motion.button>
    </form>
  );
}
