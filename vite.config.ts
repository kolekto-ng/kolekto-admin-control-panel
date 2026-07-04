import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Fail the build immediately if VITE_API_URL is still pointing at localhost
  // when building for production. Vite bakes env values into the bundle at
  // compile time — a localhost URL baked into a production build means every
  // call to the Express backend fails in the browser with ERR_CONNECTION_REFUSED.
  // The only safe way to catch this is here, before the bundle is emitted.
  //
  // How this gets triggered: .env.production is gitignored (credentials).
  // If the build machine / CI does not have that file (or the VITE_API_URL
  // env var set explicitly), Vite loads only .env whose VITE_API_URL is the
  // localhost test value — silently producing a broken production bundle.
  //
  // Fix: create .env.production with VITE_API_URL=https://api.kolekto.com.ng/api
  // (or set that env var in your CI/CD pipeline) before running npm run build.
  if (mode === "production") {
    const apiUrl = env.VITE_API_URL ?? "";
    if (!apiUrl || apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1")) {
      throw new Error(
        `\n\n❌ BUILD ABORTED — VITE_API_URL="${apiUrl || "(not set)"}" in production mode.\n` +
        `Baking a localhost URL into the production bundle causes ERR_CONNECTION_REFUSED\n` +
        `for every backend API call (Payment Monitoring, Withdrawal Approval, etc.).\n\n` +
        `Fix: set VITE_API_URL=https://api.kolekto.com.ng/api in .env.production\n` +
        `or as a CI/CD environment variable, then re-run npm run build.\n`,
      );
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Route-level code splitting (see App.tsx's React.lazy() imports)
          // already keeps each page's own code out of the initial bundle.
          // These vendor groups exist for what route-splitting alone can't
          // fix: large third-party packages shared across many routes would
          // otherwise get duplicated into every page chunk that imports
          // them. Grouping them once also means they're cached by the
          // browser independent of app-code deploys (they change far less
          // often than our own pages).
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (/node_modules\/(react|react-dom|react-router-dom|scheduler)\//.test(id)) {
              return "vendor-react";
            }
            if (id.includes("node_modules/@supabase")) {
              return "vendor-supabase";
            }
            if (id.includes("node_modules/@tanstack")) {
              return "vendor-query";
            }
            // recharts is only actually used by AmbassadorDetailPage today
            // (see src/components/ui/chart.tsx, currently unused elsewhere)
            // — route-splitting alone already keeps it out of every other
            // page's chunk. This just gives it a stable, cacheable name
            // instead of being inlined into that one page chunk.
            if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
              return "vendor-charts";
            }
            if (id.includes("node_modules/@radix-ui")) {
              return "vendor-radix";
            }
            return undefined;
          },
        },
      },
    },
  };
});
