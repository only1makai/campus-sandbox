"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Profile } from "@/types";
import { saveProfileAction } from "@/app/actions/profile";
import { tapPress, transitionFast } from "@/lib/motion";

const input =
  "w-full rounded-btn border-2 border-ink bg-cream px-3 py-2 text-body text-ink placeholder:text-text-faint focus:outline-none focus:bg-card";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between text-meta font-semibold text-ink">
        {label}
        {hint && <span className="font-normal text-text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Full profile editor with explicit save + unambiguous save state. Handle is
 *  read-only (permanent platform identifier). */
export default function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [collegeYear, setCollegeYear] = useState(profile.collegeYear ?? "");
  const [pronouns, setPronouns] = useState(profile.pronouns ?? "");
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl ?? "");
  const [contactEmail, setContactEmail] = useState(profile.contactEmail ?? "");
  const [instagramUrl, setInstagramUrl] = useState(profile.instagramUrl ?? "");
  const [state, setState] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, startT] = useTransition();

  const save = () => {
    setError(null);
    setState("idle");
    startT(async () => {
      const r = await saveProfileAction({
        displayName,
        bio,
        collegeYear,
        pronouns,
        githubUrl,
        websiteUrl,
        contactEmail,
        instagramUrl,
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
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label="Display name">
        <input className={input} value={displayName} maxLength={60} onChange={(e) => setDisplayName(e.target.value)} />
      </Field>

      <Field label="Handle" hint="permanent — can't be changed">
        <input className={`${input} cursor-not-allowed opacity-70`} value={`@${profile.handle}`} readOnly />
      </Field>

      <Field label="Bio" hint={`${bio.length}/280`}>
        <textarea className={input} rows={3} maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A line about you." />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="College & year">
          <input className={input} value={collegeYear} maxLength={60} onChange={(e) => setCollegeYear(e.target.value)} placeholder="College Ten · TIM '28" />
        </Field>
        <Field label="Pronouns">
          <input className={input} value={pronouns} maxLength={40} onChange={(e) => setPronouns(e.target.value)} placeholder="they/them" />
        </Field>
      </div>

      <Field label="GitHub">
        <input className={input} value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/…" />
      </Field>
      <Field label="Website">
        <input className={input} value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…" />
      </Field>
      <Field label="Instagram">
        <input className={input} value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/…" />
      </Field>
      <Field label="Contact email">
        <input className={input} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@ucsc.edu" />
      </Field>

      {error && (
        <p className="rounded-chip border-2 border-ink bg-tomato px-3 py-2 text-meta font-semibold text-white">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <motion.button
          type="submit"
          disabled={busy}
          whileTap={tapPress}
          transition={transitionFast}
          className="rounded-btn border-2 border-ink bg-gold px-4 py-2.5 font-sans text-body font-semibold text-ink shadow-resting transition-shadow hover:shadow-elevated hover:bg-gold-hover disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </motion.button>
        {state === "saved" && !busy && (
          <span className="text-meta font-semibold text-live-green">All changes saved</span>
        )}
      </div>
    </form>
  );
}
