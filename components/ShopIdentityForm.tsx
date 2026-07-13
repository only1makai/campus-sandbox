"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { ShopIdentity, SupportingColor } from "@/types";
import { saveShopIdentity } from "@/app/actions/studio";
import { FILL } from "@/lib/colors";
import { tapPress, transitionFast } from "@/lib/motion";
import HeroUploader from "@/components/HeroUploader";

const COLORS: SupportingColor[] = ["gold", "live-green", "link-blue", "tomato", "grape"];
const input =
  "w-full rounded-btn border-2 border-ink bg-cream px-3 py-2 text-body text-ink placeholder:text-text-faint focus:outline-none focus:bg-card";

/** Studio-only editor for the storefront shown on the public profile's Selling
 *  section. Unset fields render nothing on the profile (no placeholders). */
export default function ShopIdentityForm({ identity }: { identity: ShopIdentity }) {
  const router = useRouter();
  const [name, setName] = useState(identity.shopName ?? "");
  const [tagline, setTagline] = useState(identity.shopTagline ?? "");
  const [color, setColor] = useState<SupportingColor>(identity.shopBannerColor ?? "gold");
  const [hero, setHero] = useState<string | null>(identity.shopHeroUrl ?? null);
  const [tags, setTags] = useState<string[]>(identity.specialtyTags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [acceptsCustom, setAcceptsCustom] = useState(identity.acceptsCustom ?? false);
  const [story, setStory] = useState(identity.shopStory ?? "");
  const [state, setState] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  const addTag = () => {
    const t = tagDraft.trim();
    if (!t || tags.length >= 5 || tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setTagDraft("");
      return;
    }
    setTags([...tags, t]);
    setTagDraft("");
  };

  const save = () => {
    setError(null);
    setState("idle");
    startT(async () => {
      const r = await saveShopIdentity({
        shopName: name,
        shopTagline: tagline,
        shopBannerColor: color,
        shopHeroUrl: hero,
        specialtyTags: tags,
        acceptsCustom,
        shopStory: story,
      });
      if (!r.ok) {
        setError(r.message ?? "Something went wrong.");
        return;
      }
      setState("saved");
      router.refresh();
    });
  };

  return (
    <form
      className="mt-3 flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <HeroUploader value={hero} onChange={setHero} />

      <label className="flex flex-col gap-1">
        <span className="text-meta font-semibold text-ink">Shop name</span>
        <input className={input} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Fog Candle Co." />
      </label>
      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between text-meta font-semibold text-ink">
          Tagline <span className="font-normal text-text-faint">{tagline.length}/80</span>
        </span>
        <input className={input} value={tagline} maxLength={80} onChange={(e) => setTagline(e.target.value)} placeholder="Soy candles in campus scents." />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-meta font-semibold text-ink">Banner color</span>
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`h-9 w-9 rounded-chip border-2 ${FILL[c]} ${
                color === c ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-paper" : "border-ink/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* specialty tags — up to 5 chips */}
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between text-meta font-semibold text-ink">
          Specialty tags <span className="font-normal text-text-faint">{tags.length}/5</span>
        </span>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 text-meta font-semibold text-ink">
                {t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="text-text-faint hover:text-tomato">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        {tags.length < 5 && (
          <div className="flex gap-2">
            <input
              className={input}
              value={tagDraft}
              maxLength={24}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="e.g. hand-poured"
            />
            <button
              type="button"
              onClick={addTag}
              className="shrink-0 rounded-btn border-2 border-ink bg-card px-3 text-meta font-semibold text-ink shadow-resting hover:bg-paper"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* custom-orders toggle */}
      <div className="flex items-start justify-between gap-3 rounded-btn border-2 border-ink bg-cream px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-meta font-semibold text-ink">Accepting custom orders</p>
          <p className="text-meta text-text-secondary">Shows a badge so buyers know they can ask for made-to-order work.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={acceptsCustom}
          onClick={() => setAcceptsCustom((v) => !v)}
          className={`relative h-6 w-11 shrink-0 rounded-full border-2 border-ink transition-colors ${
            acceptsCustom ? "bg-live-green" : "bg-card"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full border-2 border-ink bg-card transition-all ${
              acceptsCustom ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {/* shop story */}
      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between text-meta font-semibold text-ink">
          Shop story <span className="font-normal text-text-faint">{story.length}/400</span>
        </span>
        <textarea
          className={input}
          value={story}
          rows={4}
          maxLength={400}
          onChange={(e) => setStory(e.target.value)}
          placeholder="This is about the shop, not you — what you make and why."
        />
      </label>

      {error && (
        <p className="rounded-chip border-2 border-ink bg-tomato px-3 py-2 text-meta font-semibold text-white">{error}</p>
      )}
      <div className="flex items-center gap-3">
        <motion.button
          type="submit"
          disabled={busy}
          whileTap={tapPress}
          transition={transitionFast}
          className="rounded-btn border-2 border-ink bg-gold px-4 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save storefront"}
        </motion.button>
        {state === "saved" && !busy && (
          <span className="text-meta font-semibold text-live-green">All changes saved</span>
        )}
      </div>
    </form>
  );
}
