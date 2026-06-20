import axios from "axios";
import { supabase } from "@/integrations/supabase/client";

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
  console.log(`[admin axios] baseURL = ${baseURL} (mode=${import.meta.env.MODE})`);
}

export const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add a request interceptor to always use the latest token
axiosInstance.interceptors.request.use(
  async (config) => {
    // Ask Supabase for the active session instead of parsing its private
    // local-storage representation. getSession() also refreshes an expired
    // access token when possible, so approval requests do not leave with a
    // stale JWT after the admin panel has been open for a while.
    const { data, error } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!error && accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error),
);
