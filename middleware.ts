import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Refreshes the Supabase session cookie on every request (App Router SSR). */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Env not configured: skip session refresh so public pages still render
    // (they fall back to fixtures) instead of 500ing every request.
    console.warn("[middleware] Supabase env missing — skipping session refresh");
    return response;
  }

  const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touch the session so expired tokens get refreshed and cookies re-issued.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Logged-out "/" → serve the marketing landing WITHOUT changing the URL, so
  // the landing (a (marketing) route) escapes the (app) chrome. Logged-in users
  // fall through to (app)/page.tsx (the Beta Board feed).
  if (pathname === "/" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/landing";
    const rewrite = NextResponse.rewrite(url, { request });
    response.cookies.getAll().forEach((c) => rewrite.cookies.set(c));
    return rewrite;
  }

  // Note: `/landing` is intentionally reachable by BOTH auth states — the header
  // wordmark links there for everyone (Session 14). The landing page itself is
  // auth-aware (getCurrentUser → "Back to app" + live CTAs when logged in), so
  // there's no longer a guard bouncing signed-in visitors back to `/`. The `/`
  // rewrite above (logged-out → landing) is unchanged.

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
