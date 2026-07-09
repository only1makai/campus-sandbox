import type { Profile } from "@/types";
import { FILL } from "@/lib/colors";

/**
 * Avatar initial + @handle — the shared identity chip used on cards, in the
 * request thread, and in the requests list. Unifies the block that was
 * copy-pasted across MakerCard/AppCard. Compose ratings/location alongside it.
 */
export default function SellerBadge({
  profile,
  size = "sm",
  bordered = false,
}: {
  profile: Pick<Profile, "handle" | "avatarColor">;
  size?: "sm" | "md";
  bordered?: boolean;
}) {
  const dim = size === "md" ? "h-7 w-7" : "h-6 w-6";
  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex ${dim} items-center justify-center rounded-full text-[11px] font-bold text-white ${
          bordered ? "border-2 border-ink" : ""
        } ${FILL[profile.avatarColor]}`}
      >
        {profile.handle[0]?.toUpperCase() ?? "?"}
      </span>
      <span
        className={`text-meta text-text-secondary ${size === "md" ? "font-semibold text-ink" : ""}`}
      >
        @{profile.handle}
      </span>
    </span>
  );
}
