import axios from "axios";

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
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    let token = localStorage.getItem("kolekto-auth-token");
    if (token) {
      try {
        token = JSON.parse(token);
        if (token && token.access_token) {
          config.headers.Authorization = `Bearer ${token.access_token}`;
        }
      } catch (e) {
        // Invalid token in storage
        config.headers.Authorization = undefined;
      }
    } else {
      config.headers.Authorization = undefined;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
