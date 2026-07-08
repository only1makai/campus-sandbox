"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfileAction } from "@/app/actions/profile";
import { tapPress, transitionBase, transitionFast } from "@/lib/motion";

/** Bio-only edit stub — groundwork, not the final profile editor (avatar
 *  upload lives in AvatarUpload; a Design pass comes later). */
export default function EditProfile({ initialBio }: { initialBio: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState(initialBio);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateProfileAction({ bio });
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
        whileTap={tapPress}
        transition={transitionFast}
        className="rounded-btn border-2 border-ink bg-card px-4 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-cream"
      >
        {open ? "Close" : "Edit profile"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transitionBase}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={280}
                placeholder="A short bio — what do you build, make, or forage?"
                className="w-full rounded-btn border-2 border-ink bg-cream px-3 py-2 text-body text-ink placeholder:text-text-faint focus:bg-card focus:outline-none"
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
                whileTap={tapPress}
                transition={transitionFast}
                className="self-start rounded-btn border-2 border-ink bg-gold px-4 py-2 font-sans text-meta font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover active:bg-gold-active disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save bio"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
