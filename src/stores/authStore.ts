import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN EMAIL ALLOWLIST
// ─────────────────────────────────────────────────────────────────────────────
// The admin panel must reject ANY login attempt from an email that is not in
// this list. Without this gate, a regular user account could log in to the
// admin panel via Supabase and bypass UI-level controls — even if the
// backend's `requireAdmin` middleware would block their API calls, the admin
// panel writes to several tables (kyc_documents, kyc_verifications,
// withdrawals) directly via the Supabase client. Those direct writes are
// only protected by the user's Supabase JWT, NOT by `requireAdmin`.
//
// Sources, in priority order:
//   1. VITE_ADMIN_EMAILS env (comma-separated) — set in admin .env for prod
//   2. Hardcoded default — used in dev/local before env is set
//
// IMPORTANT: This is layer-1 defense. The full fix is RLS policies on
// kyc_documents / kyc_verifications / withdrawals that deny writes from
// non-admin JWTs. Until that's deployed, this client-side gate + the
// backend's `requireAdmin` middleware are the two enforcement layers.
const HARDCODED_ADMIN_EMAILS = ["gazalianfellow@gmail.com"];

function getAllowedAdminEmails(): string[] {
  const fromEnv = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined) || "";
  const fromEnvList = fromEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnvList.length > 0) return fromEnvList;
  return HARDCODED_ADMIN_EMAILS.map((e) => e.toLowerCase());
}

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowedAdminEmails().includes(email.toLowerCase());
}

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

          // ADMIN EMAIL ALLOWLIST GATE.
          // The Supabase login itself just verifies email+password — it does
          // not know about admin vs. user. We immediately sign out any
          // account that authenticates with a non-allowlisted email so they
          // never get a valid admin session in localStorage.
          const signedInEmail = data.user?.email || "";
          if (!isAdminEmail(signedInEmail)) {
            // Best-effort sign-out so no session lingers in localStorage.
            try {
              await supabase.auth.signOut();
            } catch {
              /* ignore — we're clearing state anyway */
            }
            set({ user: null, session: null, loading: false });
            return {
              error: {
                message:
                  "This account does not have admin access. Please contact a system administrator.",
                code: "NOT_AN_ADMIN",
              },
            };
          }

          set({
            user: data.user,
            session: data.session,
            loading: false,
          });

          return { error: null };
        } catch (error) {
          set({ loading: false });
          return { error };
        }
      },

      signOut: async () => {
        set({ loading: true });
        await supabase.auth.signOut();
        set({
          user: null,
          session: null,
          loading: false,
        });
      },

      initialize: async () => {
        if (get().initialized) return;

        set({ loading: true });

        // Get initial session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // SAFETY NET: if a non-admin session is somehow restored from
        // localStorage (e.g. existing session predates this allowlist gate),
        // sign them out immediately on app start. This blocks the previously-
        // signed-in non-admin account that's currently sitting in your
        // browser from staying logged in.
        if (session?.user?.email && !isAdminEmail(session.user.email)) {
          try {
            await supabase.auth.signOut();
          } catch {
            /* ignore */
          }
          set({
            user: null,
            session: null,
            loading: false,
            initialized: true,
          });
          return;
        }

        set({
          user: session?.user ?? null,
          session,
          loading: false,
          initialized: true,
        });

        // Listen for auth changes — also enforce the allowlist here so a
        // forged session restore (e.g. from another tab) can't bypass it.
        supabase.auth.onAuthStateChange((_event, newSession) => {
          if (newSession?.user?.email && !isAdminEmail(newSession.user.email)) {
            void supabase.auth.signOut();
            set({ user: null, session: null });
            return;
          }
          set({
            user: newSession?.user ?? null,
            session: newSession,
          });
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
