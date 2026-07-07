"use client";

import { useEffect } from "react";

/** Registers the app-shell service worker. Production only — a SW in dev
 *  would fight Turbopack's own asset invalidation/HMR. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[sw] registration failed:", err);
    });
  }, []);

  return null;
}
