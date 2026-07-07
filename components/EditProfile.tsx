"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfileAction } from "@/app/actions/profile";

const INK = "#262014";
const SPRING = [0.34, 1.56, 0.64, 1] as const;

const inputClass =
  "w-full rounded-btn border-2 border-ink bg-cream px-3 py-2 text-body text-ink placeholder:text-text-faint focus:bg-card focus:outline-none";

/** Minimal edit stub for the shared identity fields — groundwork, not the
 *  final profile editor (a Design pass comes later). */
export default function EditProfile({
  initialBio,
  initialAvatarImageUrl,
}: {
  initialBio: string;
  initialAvatarImageUrl: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState(initialBio);
  const [avatarImageUrl, setAvatarImageUrl] = useState(initialAvatarImageUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateProfileAction({ bio, avatarImageUrl });
      if (!result.ok) {
        setError(result.message ?? "Could not save — try again.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="mt-4">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileTap={{ y: 2, boxShadow: `1px 1px 0 ${INK}` }}
        transition={{ duration: 0.16, ease: SPRING }}
        style={{ boxShadow: `3px 3px 0 ${INK}` }}
        className="rounded-btn border-2 border-ink bg-card px-4 py-2 font-sans text-meta font-semibold text-ink hover:bg-cream"
      >
        {open ? "Close" : "Edit profile"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: SPRING }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={280}
                placeholder="A short bio — what do you build, make, or forage?"
                className={inputClass}
              />
              <input
                type="url"
                value={avatarImageUrl}
                onChange={(e) => setAvatarImageUrl(e.target.value)}
                placeholder="Avatar image URL (optional, https://…)"
                className={inputClass}
              />
              {error && (
                <p className="rounded-chip border-2 border-ink bg-tomato px-3 py-2 text-meta font-semibold text-white">
                  {error}
                </p>
              )}
              <motion.button
                type="button"
                onClick={save}
                disabled={busy}
                whileTap={{ y: 2, boxShadow: `1px 1px 0 ${INK}` }}
                style={{ boxShadow: `3px 3px 0 ${INK}` }}
                className="rounded-btn border-2 border-ink bg-gold px-4 py-2 font-sans text-meta font-semibold text-ink hover:bg-gold-hover active:bg-gold-active disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
