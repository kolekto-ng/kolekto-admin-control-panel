import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const ADMIN_SCROLL_CONTAINER_ID = "admin-scroll-container";

/**
 * Restore the admin content pane's scroll offset when returning to a page.
 *
 * The app does not scroll `window` — `<main>` in AdminLayout is the scroll
 * container — so neither the browser's native restoration nor react-router's
 * <ScrollRestoration> (which is Data-Router-only, and this app uses
 * <BrowserRouter>) applies here. This stores the offset per history entry.
 *
 * `location.key` is the right storage key: react-router mints one per history
 * entry and hands the *same* key back on a POP, so going Back to the users list
 * reads the offset saved when leaving it, while a fresh push to the same path
 * correctly starts at the top.
 *
 * @param ready Restore only once the rows that give the page its height exist —
 *              scrolling a still-empty container would silently clamp to 0.
 */
export function useScrollRestoration(ready: boolean) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const restoredFor = useRef<string | null>(null);
  const storageKey = `admin-scroll:${location.key}`;

  // Track the live offset. Written on scroll (rAF-throttled) so the value is
  // already saved when the component unmounts during navigation.
  useEffect(() => {
    const el = document.getElementById(ADMIN_SCROLL_CONTAINER_ID);
    if (!el) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        try {
          sessionStorage.setItem(storageKey, String(el.scrollTop));
        } catch {
          /* private mode / quota — scroll position is not worth failing over */
        }
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
    };
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    if (restoredFor.current === storageKey) return;

    // A brand-new navigation should start at the top; only Back/Forward restores.
    if (navigationType !== "POP") {
      restoredFor.current = storageKey;
      return;
    }

    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(storageKey);
    } catch {
      return;
    }
    if (saved === null) {
      restoredFor.current = storageKey;
      return;
    }

    const el = document.getElementById(ADMIN_SCROLL_CONTAINER_ID);
    if (!el) return;

    // One frame after the rows commit, so the container has its full height.
    const frame = requestAnimationFrame(() => {
      el.scrollTop = Number(saved) || 0;
      restoredFor.current = storageKey;
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, storageKey, navigationType]);
}
