import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

// Resolve the API base URL.
//
// Previously this hardcoded `http://localhost:5000/api` for dev mode, but the
// backend listens on port 5050 (see kolekto-be-old/app.js — `PORT || 5050`).
// That mismatch meant every admin→backend call in local dev would fail with
// "Network Error" and the FE would render "Could not reach the backend."
//
// Rules:
//   - If VITE_API_URL is set in env (any mode), use it. This lets local devs
//     point at staging/prod from .env without code changes.
//   - Otherwise fall back to localhost:5050 (matches the backend default).
const envApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const baseURL = envApiUrl && envApiUrl.length > 0
  ? envApiUrl
  : "http://localhost:5050/api";

if (import.meta.env.MODE !== "production") {
  // eslint-disable-next-line no-console
  console.log(
    `[admin axios] baseURL = ${baseURL}` +
    ` | mode = ${import.meta.env.MODE}` +
    ` | VITE_API_URL env = ${import.meta.env.VITE_API_URL ?? "(not set — using fallback)"}`,
  );
}

export const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Diagnostic interceptor — dev/test only. Logs the exact URL that will be
// sent so that URL-base misconfiguration is visible immediately in DevTools.
if (import.meta.env.MODE !== "production") {
  axiosInstance.interceptors.request.use((config) => {
    const method = (config.method ?? "GET").toUpperCase();
    const full = (config.baseURL ?? "") + (config.url ?? "");
    // eslint-disable-next-line no-console
    console.log(`[admin axios] → ${method} ${full}`);
    return config;
  });
}

// Add a request interceptor to always use the latest token.
//
// This reads the token synchronously from the auth store instead of calling
// supabase.auth.getSession() on every request. getSession() serializes
// behind Supabase's cross-tab auth lock (the Web Locks API) — if that lock
// is ever left held (a known supabase-js failure mode under concurrent
// calls), every future getSession() call hangs forever. Because an SPA
// never tears down the page on client-side navigation, a hang triggered by
// one request stays stuck and silently blocks every subsequent request —
// which is what made affected pages look frozen until a full reload (a
// reload destroys the document, which releases the held Web Lock).
//
// The auth store's `session` is kept current via the onAuthStateChange
// listener set up in authStore's initialize() (including TOKEN_REFRESHED),
// so reading it here is just as up to date without the lock risk.
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().session?.access_token;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error),
);
