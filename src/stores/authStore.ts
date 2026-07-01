import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP DIAGNOSTICS
// Printed once at module load. Helps immediately catch environment
// cross-wiring (the root cause of JWSInvalidSignature incidents where a
// session token signed by Project A is presented to Project B).
// ─────────────────────────────────────────────────────────────────────────────
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "";
const projectRef = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] || "unknown";
const KNOWN_ENVIRONMENTS: Record<string, string> = {
  busfgcmbndleljklrcbd: "production",
  lpeeckqsltxohppheucz: "test",
};
const environment = KNOWN_ENVIRONMENTS[projectRef] ?? "unknown";
console.log("[authStore] startup diagnostics", {
  supabaseUrl,
  projectRef,
  environment,
  viteApiUrl: import.meta.env.VITE_API_URL || "(not set)",
  mode: import.meta.env.MODE,
});

// ─────────────────────────────────────────────────────────────────────────────
// SESSION REDIRECT REASONS
// Written to sessionStorage before clearing an invalid session so that
// LoginPage can surface a precise, user-friendly explanation.
// ─────────────────────────────────────────────────────────────────────────────
export const SESSION_REDIRECT_REASONS = {
  environment_mismatch:
    "Your session has expired or belongs to a different environment. Please sign in again.",
  not_admin:
    "This account does not have admin access. Please contact a system administrator.",
  demoted:
    "Your admin access has been revoked. Please contact a system administrator.",
} as const;

export type SessionRedirectReason = keyof typeof SESSION_REDIRECT_REASONS;

export const SESSION_REDIRECT_KEY = "auth_redirect_reason";

export function setSessionRedirectReason(reason: SessionRedirectReason) {
  try {
    sessionStorage.setItem(SESSION_REDIRECT_KEY, reason);
  } catch { /* sessionStorage may be blocked in private browsing */ }
}

export function consumeSessionRedirectReason(): string | null {
  try {
    const reason = sessionStorage.getItem(SESSION_REDIRECT_KEY) as SessionRedirectReason | null;
    if (reason) {
      sessionStorage.removeItem(SESSION_REDIRECT_KEY);
      return SESSION_REDIRECT_REASONS[reason] ?? null;
    }
  } catch { /* ignore */ }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ACCESS — DB-backed (public.admin_users)
// ─────────────────────────────────────────────────────────────────────────────
type AdminCheckResult =
  | { isAdmin: true }
  | { isAdmin: false; code: "not_admin" }
  | { isAdmin: false; code: "environment_mismatch" }
  | { isAdmin: false; code: "error" };

async function isAuthenticatedUserAdmin(): Promise<AdminCheckResult> {
  try {
    const { data, error } = await supabase.rpc("current_admin_user");
    if (error) {
      console.error("[authStore] admin lookup failed:", error.message);
      // JWSInvalidSignature means the stored session token was signed by a
      // different Supabase project. Calling signOut() with this token would
      // fail with 403 and risk a redirect loop. We handle it separately.
      if (
        error.message?.includes("JWSInvalidSignature") ||
        error.message?.includes("JWSError") ||
        error.message?.includes("invalid JWT")
      ) {
        return { isAdmin: false, code: "environment_mismatch" };
      }
      return { isAdmin: false, code: "error" };
    }
    const hasAccess = Array.isArray(data) ? data.length > 0 : Boolean(data);
    return hasAccess ? { isAdmin: true } : { isAdmin: false, code: "not_admin" };
  } catch (err) {
    console.error("[authStore] admin lookup threw:", err);
    return { isAdmin: false, code: "error" };
  }
}

// Clear the invalid session without making a network call.
// `scope: "local"` removes the session from localStorage only and fires
// the SIGNED_OUT auth state change locally — it never hits Supabase's API,
// so an invalid/cross-project token cannot cause a 403 loop.
async function clearSessionLocally() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Absolute last resort: directly remove the storage key.
    try {
      const storageKey = "kolekto-auth-token";
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH STORE
// ─────────────────────────────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: false,
      initialized: false,

      signIn: async (email: string, password: string) => {
        set({ loading: true });

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ loading: false });
            return { error };
          }

          // ADMIN GATE: verify DB membership before accepting the session.
          const result = await isAuthenticatedUserAdmin();
          if (!result.isAdmin) {
            // Sign out on the network (the token is brand-new and valid, so
            // a standard signOut() call will succeed here).
            try {
              await supabase.auth.signOut();
            } catch { /* ignore */ }
            set({ user: null, session: null, loading: false });
            return {
              error: {
                message: SESSION_REDIRECT_REASONS.not_admin,
                code: "NOT_AN_ADMIN",
              },
            };
          }

          set({ user: data.user, session: data.session, loading: false });
          return { error: null };
        } catch (error) {
          set({ loading: false });
          return { error };
        }
      },

      signOut: async () => {
        set({ loading: true });
        try {
          await supabase.auth.signOut();
        } catch { /* ignore — we're clearing state regardless */ }
        set({ user: null, session: null, loading: false });
      },

      initialize: async () => {
        if (get().initialized) return;
        set({ loading: true });

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const result = await isAuthenticatedUserAdmin();

          if (!result.isAdmin) {
            if (result.code === "environment_mismatch") {
              // The token was signed by a DIFFERENT Supabase project — a
              // network signOut() would 403 and leave the client confused.
              // Clear locally instead, store the redirect reason for LoginPage
              // to display a clear explanation, then bail.
              console.warn(
                "[authStore] session environment mismatch — clearing locally (projectRef=" +
                  projectRef + " environment=" + environment + ")"
              );
              setSessionRedirectReason("environment_mismatch");
              await clearSessionLocally();
            } else if (result.code === "not_admin" || result.code === "error") {
              // Token is valid for this project but the account isn't an admin.
              // Normal signOut() is safe here.
              setSessionRedirectReason("not_admin");
              try { await supabase.auth.signOut(); } catch { /* ignore */ }
            }

            set({ user: null, session: null, loading: false, initialized: true });
            return;
          }
        }

        set({
          user: session?.user ?? null,
          session,
          loading: false,
          initialized: true,
        });

        // Re-check DB membership on every subsequent session change.
        supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (newSession?.user) {
            const result = await isAuthenticatedUserAdmin();
            if (!result.isAdmin) {
              if (result.code === "environment_mismatch") {
                setSessionRedirectReason("environment_mismatch");
                await clearSessionLocally();
              } else {
                setSessionRedirectReason("demoted");
                void supabase.auth.signOut();
              }
              set({ user: null, session: null });
              return;
            }
          }
          set({ user: newSession?.user ?? null, session: newSession });
        });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);
