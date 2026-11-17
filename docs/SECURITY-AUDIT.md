# Secrets audit

**2026-11-17**, `main` at `10956bc`, all 33 commits. Roadmap item 2.1.

**Result: no secrets in the working tree or in history.** Nothing to rotate.

## Method
- [detect-secrets](https://github.com/Yelp/detect-secrets) 1.5.0, default plugins, `--all-files`, run on the snapshot of every commit on `main`. Every blob ever committed appears in at least one snapshot, so this covers full history. (gitleaks/trufflehog were the roadmap's suggestion; their binaries couldn't be installed in the agent sandbox.)
- A second pass over `git log -p` for Supabase- and project-specific shapes: JWTs, `sbp_` / `sb_secret_` / `sb_publishable_` keys, `<ref>.supabase.co` URLs, Postgres URLs with passwords, Anthropic keys, private key blocks.

## Findings
| Where | Scanner says | Verdict |
|---|---|---|
| `.env.local.example:16` (since `09b81a8`) | Basic Auth Credentials | False positive. The `DATABASE_URL` template's user and password are `YOUR-PROJECT-REF` / `YOUR-ENCODED-PASSWORD` placeholders in every commit |
| `pnpm-lock.yaml` (16,974 hits across all snapshots) | Base64 High Entropy String | False positive. Every hit is on an `integrity: sha512-...` package-hash line |

Second pass: zero hits for every pattern except the same placeholder `DATABASE_URL`.

## Ignore rules
- The only `.env*` path ever committed is `.env.local.example`.
- `git check-ignore -v .env.local` → `.gitignore:34:.env*` (`.gitignore:35` re-includes `!.env.local.example`).

## Re-running
```bash
pip install detect-secrets
detect-secrets scan --all-files --exclude-files 'pnpm-lock\.yaml'
```
Any result other than the `.env.local.example:16` placeholder needs a look.
