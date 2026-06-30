import { useEffect, useRef } from "react";
import { usePathname } from "@/components/ui/navigation";
import { useSettings } from "@/spa/data/settings";
import { BASE_PATH as BP } from "@/lib/config";

// Anonymous page-view + dwell tracker. Sends a beacon (path, visitor id,
// session id, dwell ms) to /api/track on each route change and on tab hide.
// visitor_id persists (localStorage) -> recurring visitors; session_id is
// per-tab (sessionStorage). No PII.

function id(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export default function PageAnalytics() {
  const pathname = usePathname();
  const { viewTracking } = useSettings();
  const tracking = useRef(viewTracking);
  tracking.current = viewTracking;
  const ids = useRef<{ vid: string; sid: string } | null>(null);
  const current = useRef<string>(pathname);
  const start = useRef<number>(0);

  // resolve anonymous ids once
  useEffect(() => {
    let vid = localStorage.getItem("kb_vid");
    if (!vid) {
      vid = id();
      localStorage.setItem("kb_vid", vid);
    }
    let sid = sessionStorage.getItem("kb_sid");
    if (!sid) {
      sid = id();
      sessionStorage.setItem("kb_sid", sid);
    }
    ids.current = { vid, sid };
    start.current = performance.now();
  }, []);

  const send = (path: string, dwellMs: number) => {
    if (!tracking.current || !ids.current || !path) return;
    const payload = JSON.stringify({
      path,
      visitorId: ids.current.vid,
      sessionId: ids.current.sid,
      dwellMs: Math.round(dwellMs),
    });
    const url = `${BP}/api/track`;
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    } else {
      void fetch(url, {
        method: "POST",
        body: payload,
        keepalive: true,
        headers: { "content-type": "application/json" },
      });
    }
  };

  // flush the previous page's dwell on client-side navigation, then reset timer
  useEffect(() => {
    const prev = current.current;
    if (prev && prev !== pathname && start.current) {
      send(prev, performance.now() - start.current);
    }
    current.current = pathname;
    start.current = performance.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // flush on tab hide / unload (covers the last page before leaving)
  useEffect(() => {
    const flush = () => {
      if (start.current) send(current.current, performance.now() - start.current);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
