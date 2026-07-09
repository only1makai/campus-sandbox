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
