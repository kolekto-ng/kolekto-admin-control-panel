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
  rpc_error:
    "Unable to verify admin access — the system may be temporarily unavailable. Please try again.",
} as const;

export type SessionRedirectReason = keyof typeof SESSION_REDIRECT_REASONS;
// How many times to retry an admin RPC check that returns code: "error"
// before treating it as a session failure. This prevents network blips from
// signing out a valid admin.
const ADMIN_CHECK_RETRY_LIMIT = 2;

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
// Admin role, sourced from public.admin_users via the current_admin_user RPC.
// This is the SINGLE authorization source for the whole admin panel — no
// hardcoded emails, no env checks, no frontend role definitions.
export type AdminRole = "admin" | "superadmin";

type AdminCheckResult =
  | { isAdmin: true; role: AdminRole }
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
    // current_admin_user() returns a table (0 or 1 rows) with { role }. The
    // generated Supabase types don't include this RPC, so cast to the shape we
    // know it returns.
    const row = (Array.isArray(data) ? data[0] : data) as { role?: string } | null | undefined;
    if (!row) return { isAdmin: false, code: "not_admin" };
    // Anything that isn't the explicit 'superadmin' string degrades to the
    // least-privilege 'admin' — a malformed role must never grant more access.
    const role: AdminRole = row.role === "superadmin" ? "superadmin" : "admin";
    return { isAdmin: true, role };
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
  // Admin role from admin_users. `null` = not yet resolved (e.g. the RPC
  // errored and the session was accepted optimistically). Consumers treat
  // only the explicit 'admin' value as "restricted"; the backend remains the
  // authority and 403s regardless.
  role: AdminRole | null;
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
      role: null,
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
            if (result.code === "error") {
              // The RPC check failed at the moment of login (could be a cold-start
              // DB latency, missing function, or network blip). Rather than locking
              // the admin out permanently, accept the session and let subsequent
              // requests surface the real access level. The admin panel's protected
              // routes will catch unauthorized access at the data layer.
              console.warn("[authStore] signIn: admin RPC check failed — accepting new session optimistically");
              set({ user: data.user, session: data.session, role: null, loading: false });
              return { error: null };
            }

            // Definitively not an admin — sign out.
            try {
              await supabase.auth.signOut();
            } catch { /* ignore */ }
            set({ user: null, session: null, role: null, loading: false });
            return {
              error: {
                message: SESSION_REDIRECT_REASONS.not_admin,
                code: "NOT_AN_ADMIN",
              },
            };
          }

          set({ user: data.user, session: data.session, role: result.role, loading: false });
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
        set({ user: null, session: null, role: null, loading: false });
      },

      initialize: async () => {
        if (get().initialized) return;
        set({ loading: true });

        const {
          data: { session },
        } = await supabase.auth.getSession();

        let resolvedRole: AdminRole | null = null;
        if (session?.user) {
          const result = await isAuthenticatedUserAdmin();
          if (result.isAdmin) resolvedRole = result.role;

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
              set({ user: null, session: null, loading: false, initialized: true });
              return;
            } else if (result.code === "error") {
              // The admin RPC itself failed (network blip, DB unavailable, or the
              // current_admin_user function is not yet deployed). An RPC error is
              // NOT proof the account lacks admin access — do NOT sign out. Accept
              // the session optimistically and fall through so the normal state-set
              // and onAuthStateChange listener are still established.
              console.warn(
                "[authStore] admin RPC check failed — accepting session optimistically. " +
                "Will re-check on next auth state change."
              );
              // Fall through — no return here.
            } else if (result.code === "not_admin") {
              // Token is valid for this project but the account is definitively
              // not in admin_users. Safe to sign out via the network.
              setSessionRedirectReason("not_admin");
              try { await supabase.auth.signOut(); } catch { /* ignore */ }
              set({ user: null, session: null, loading: false, initialized: true });
              return;
            }
          }
        }

        set({
          user: session?.user ?? null,
          session,
          role: resolvedRole,
          loading: false,
          initialized: true,
        });

        // Re-check DB membership on every subsequent session change.
        supabase.auth.onAuthStateChange(async (_event, newSession) => {
          let nextRole: AdminRole | null = null;
          if (newSession?.user) {
            const result = await isAuthenticatedUserAdmin();
            if (result.isAdmin) nextRole = result.role;
            if (!result.isAdmin) {
              if (result.code === "environment_mismatch") {
                setSessionRedirectReason("environment_mismatch");
                await clearSessionLocally();
                set({ user: null, session: null });
                return;
              } else if (result.code === "not_admin") {
                // Definitively not an admin — sign out.
                setSessionRedirectReason("demoted");
                void supabase.auth.signOut();
                set({ user: null, session: null });
                return;
              } else if (result.code === "error") {
                // RPC failure — keep existing session, don't sign out.
                console.warn("[authStore] onAuthStateChange: admin RPC failed — keeping session.");
                // Fall through to normal state update below.
              }
            }
          }
          // On a signed-in session, use the freshly resolved role; if the RPC
          // errored (nextRole null) preserve the previously known role so a
          // token refresh doesn't transiently drop a super-admin's access.
          // On sign-out (no user) clear the role.
          set({
            user: newSession?.user ?? null,
            session: newSession,
            role: newSession?.user ? (nextRole ?? get().role) : null,
          });
        });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        role: state.role,
      }),
    }
  )
);
