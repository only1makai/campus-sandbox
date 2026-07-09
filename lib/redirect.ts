/**
 * Safe internal-redirect validation for the deep-link auth flow.
 *
 * SECURITY — these rules must NOT be loosened by future sessions. A redirect
 * target is only honored if it is an internal, same-origin path on the
 * allowlist below. Everything else falls back to "/". This blocks open-redirect
 * attacks (`?next=https://evil.com`, `//evil.com`, `/\evil.com`, protocol
 * strings, and unknown internal paths).
 */

const FALLBACK = "/";

/** Exact match, or a sub-path under these (e.g. "/market/xyz"). */
const ALLOWED_EXACT_OR_SUBPATH = ["/market", "/ships", "/upvoted"];
/** Sub-tree prefixes — a real segment must follow (e.g. "/u/sammy"). */
const ALLOWED_SUBTREE = ["/u/"];

function isClean(path: string): boolean {
  if (!path.startsWith("/")) return false; // must be root-relative
  if (path.startsWith("//")) return false; // protocol-relative (//evil.com)
  if (path.includes("\\")) return false; // backslash tricks (/\evil.com)
  if (path.includes(":")) return false; // scheme/protocol (javascript:, http:)
  for (let i = 0; i < path.length; i++) {
    if (path.charCodeAt(i) < 0x20) return false; // control chars
  }
  return true;
}

function onAllowlist(path: string): boolean {
  const clean = path.split(/[?#]/)[0]; // ignore query/hash for the prefix check
  if (clean === "/") return true;
  if (ALLOWED_EXACT_OR_SUBPATH.some((p) => clean === p || clean.startsWith(`${p}/`))) {
    return true;
  }
  if (ALLOWED_SUBTREE.some((p) => clean.startsWith(p) && clean.length > p.length)) {
    return true;
  }
  return false;
}

/**
 * Returns a validated internal path, or "/" if `raw` fails any rule. Safe to
 * pass straight to `redirect()` / `NextResponse.redirect`.
 */
export function safeInternalPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return FALLBACK;

  let path: string;
  try {
    path = decodeURIComponent(raw);
  } catch {
    return FALLBACK; // malformed percent-encoding
  }

  if (!isClean(path)) return FALLBACK;
  return onAllowlist(path) ? path : FALLBACK;
}
