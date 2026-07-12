# Campus Sandbox — Project Conventions

Read this before any session. Do not re-explain these in prompts — they're already loaded.
See `/docs/IDENTITY.md`, `/docs/RANKING.md`, `/docs/CALINKS_ONBOARDING.md` for deep detail;
this file is the lookup table, not the full explanation.

## Stack
Next.js (App Router, TypeScript), Tailwind v4 (postcss.config.mjs — no tailwind.config file),
pnpm, Supabase (Postgres + Auth), framer-motion, lucide-react.

## Design system — "paper & slug" (do not reinvent, do not switch to dark/glass)
```
bg-paper       #F3EDE2      ink            #262014
bg-cream       #FAF6EE      text-primary   #262014
surface-card   #FFFFFF      text-secondary #6B6255
accent-gold    #F2A81D      text-faint     #A39680
accent-hover   #DB9614      border-soft    #E9E0D0
accent-active  #C2840E
live-green #2E9E5B   link-blue #4A7DDB   tomato #E2654E   grape #8B5FBF
```
Type: Bricolage Grotesque (headings) / Instrument Sans (body).
Spacing: 4·8·12·16·24·32·48·64. Radii: chip 10, button 12, card 20, pill 999.

**Signature treatments — implement deliberately, don't approximate:**
- Sticker shadow: hard offset solid shadow (e.g. `shadow-[4px_4px_0_#262014]`), NEVER
  blur/glow. Cards sit at a slight tilt (~3°).
- Flat fills only. No gradients on UI chrome (gradients are fine only on app-card banners).
- Motion: springy overshoot `cubic-bezier(0.34,1.56,0.64,1)`, 160–240ms. Card hover lifts
  2px + shadow grows a notch. Buttons press down onto their shadow (translateY 2px, shadow
  3px→1px). Upvote count springs 1→1.12→1 with a "+1 karma" sticker fade (~900ms).

## Identity model — CRITICAL, read before touching auth/profiles
`profiles` is the SHARED platform identity substrate — Campus Sandbox and a future second
product (CAL-Links) will both read it. Keep it generic:
- Allowed on `profiles`: handle, display_name, campus, avatar_color, avatar_image_url, bio,
  verified. Nothing product-specific (no karma totals, no Sandbox features) belongs here.
- Product-specific data (posts, karma_ledger, reviews) stays in Sandbox-owned tables.
- `lib/identity/` is the shared seam — it must never import anything Sandbox-specific.
- The `@ucsc.edu` gate is enforced at the DB trigger level (`auth.users`), not just app-side
  — this IS the verified-student mechanism. Don't weaken it without flagging it to me.
- Handles are permanent and unique (DB constraint). No rename feature exists — if asked to
  add one, it needs an alias/redirect design first; don't just make handles mutable.

## Karma guardrail — the single most important rule in this codebase
- `karma_ledger` is append-only. Never make it editable.
- `verified=true` (reviews, +15) vs `verified=false` (upvotes +1, CTA clicks +5) must stay
  distinguishable in every query that touches karma.
- **Cosmetic (`verified=false`) karma NEVER affects ranking/ordering.** This is
  non-negotiable across all future sessions unless I explicitly ask to redesign it.
- Verified karma drives a boost that is PER-POST (via `source_post_id`), CAPPED (`BOOST_CAP
  = 10`), and TIME-LIMITED (`BOOST_WINDOW_DAYS = 3`, hard cutoff). Full formula in
  `/docs/RANKING.md` — don't invent a different one.
- Self-review is blocked; one review per user per post. Known, documented, UNSOLVED gap:
  review-trading collusion rings. Don't claim this is solved; don't silently fix it either
  — that's a future session.

## Data permanence
- **Posts are never deleted.** No cron/job/RPC deletes a `posts` row anywhere. Sold thrift
  posts especially are permanent sales history — only their public feed visibility is
  time-limited (24h after `sold_at`). If a deletion path is ever added, sold posts must be
  exempt. (Requests/messages ARE cron-deleted; that's the deliberate exception — see COMMERCE.md.)

## Security conventions
- NEVER print secret values (service_role key, DB password, anon key) in chat or output —
  names only when reporting on env vars.
- `.env.local` holds exactly 4 vars: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`. Never commit
  it. `.env.local.example` is the safe-to-commit placeholder template — keep it in sync when
  vars change.
- `lib/supabase.ts` and the server client are guarded with `import "server-only"` — preserve
  this so an accidental client-side import fails the build instead of leaking a secret.
- If a task needs a real credential, secret, or dashboard action I haven't provided — STOP
  and ask. Never invent a placeholder value and pretend it works.
- Auth deep-link redirects (`?next=`) MUST pass through `lib/redirect.ts` `safeInternalPath`:
  internal paths only, allowlisted prefixes (`/`, `/market`, `/ships`, `/upvoted`, `/u/`),
  rejecting `//`, `\`, `:`/protocol, and unknown paths → `/`. Never loosen this.

## Workflow conventions
- MVP quality by default. No gold-plating, no speculative features, no auth flows beyond
  what's explicitly asked.
- STOP and ask before: any Supabase dashboard-only step, any RLS policy change, any decision
  that touches the shared identity model, or any real security issue found — report it,
  don't silently patch it.
- Verify claims live where possible (query the DB, click through the UI, report actual
  before/after numbers) rather than asserting something works.
- If a prompt implies a file/screen that doesn't exist yet, it's fine to build the minimal
  reasonable version — just say so explicitly in the summary instead of stopping to ask.

## Compact instructions
When compacting, preserve: current schema/migration state, active RLS policies, and the
status of the karma guardrail (verified vs cosmetic distinction, whether ranking is live).
Prior UI/styling discussion can be summarized more aggressively.

## Reference docs (read on demand, don't preload)
- `/docs/IDENTITY.md` — full identity boundary (shared vs Sandbox-owned tables)
- `/docs/RANKING.md` — ranking formula, boost cap/window, collusion limitation
- `/docs/COMMERCE.md` — categories (app/shop/thrift), the ephemeral Request
  system, seller ratings, ephemeral-vs-permanent retention + no-ranking guardrails
- `/docs/CALINKS_ONBOARDING.md` — how a second product connects to this identity layer
