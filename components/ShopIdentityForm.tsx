"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { ShopIdentity, SupportingColor } from "@/types";
import { saveShopIdentity } from "@/app/actions/studio";
import { FILL } from "@/lib/colors";
import { tapPress, transitionFast } from "@/lib/motion";

const COLORS: SupportingColor[] = ["gold", "live-green", "link-blue", "tomato", "grape"];
const input =
  "w-full rounded-btn border-2 border-ink bg-cream px-3 py-2 text-body text-ink placeholder:text-text-faint focus:outline-none focus:bg-card";

/** Studio-only editor for the storefront banner shown on the public profile's
 *  Selling section. Unset shop_name → no banner (renders as today). */
export default function ShopIdentityForm({ identity }: { identity: ShopIdentity }) {
  const router = useRouter();
  const [name, setName] = useState(identity.shopName ?? "");
  const [tagline, setTagline] = useState(identity.shopTagline ?? "");
  const [color, setColor] = useState<SupportingColor>(identity.shopBannerColor ?? "gold");
  const [state, setState] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  const save = () => {
    setError(null);
    setState("idle");
    startT(async () => {
      const r = await saveShopIdentity({ shopName: name, shopTagline: tagline, shopBannerColor: color });
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
