import type { SupportingColor } from "@/types";

/**
 * Single source of truth for the supporting-color → Tailwind fill mapping.
 * Previously copy-pasted across MakerCard/AppCard/Header/ShippedList/AvatarUpload.
 * Flat fills only (never gradients on chrome) — matches the globals.css tokens.
 */
export const FILL: Record<SupportingColor, string> = {
  gold: "bg-gold",
  "live-green": "bg-live-green",
  "link-blue": "bg-link-blue",
  tomato: "bg-tomato",
  grape: "bg-grape",
};

/**
 * Storefront tint (Session 16): a faint wash of the shop's banner color for the
 * ShopHeader avatar/backdrop — banner @ ~10% bg + ~30% border. Static class
 * strings (not built dynamically) so Tailwind keeps them. Approximates the
 * mockup's shop_tint (8%) / shop_tint_border (20%) tokens with on-scale steps.
 */
export const SHOP_TINT: Record<SupportingColor, string> = {
  gold: "bg-gold/10 border-gold/30",
  "live-green": "bg-live-green/10 border-live-green/30",
  "link-blue": "bg-link-blue/10 border-link-blue/30",
  tomato: "bg-tomato/10 border-tomato/30",
  grape: "bg-grape/10 border-grape/30",
};
