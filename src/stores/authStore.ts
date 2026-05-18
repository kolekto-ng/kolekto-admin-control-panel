import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ACCESS — DB-backed (public.admin_users)
// ─────────────────────────────────────────────────────────────────────────────
// Admin membership is determined by the `admin_users` table in Supabase.
// We call the SECURITY DEFINER RPC `current_admin_user()` which returns the
// caller's admin row (or no rows). The RPC respects auth.jwt() so it cannot
// be spoofed from the client.
//
// This replaces the previous hardcoded HARDCODED_ADMIN_EMAILS allowlist and
// the VITE_ADMIN_EMAILS env fallback. The migration that creates this table
// lives at kolekto-be-old/database/admin_users.sql.
//
// Defense-in-depth: this client-side gate is layer 1. The backend's
// `requireAdmin` middleware (now also DB-backed) is layer 2. RLS policies on
// admin-only tables are layer 3.
async function isAuthenticatedUserAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("current_admin_user");
    if (error) {
      console.error("[authStore] admin lookup failed:", error.message);
      return false;
    }
    return Array.isArray(data) ? data.length > 0 : Boolean(data);
  } catch (err) {
    console.error("[authStore] admin lookup threw:", err);
    return false;
  }
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

          // ADMIN GATE (DB-backed via public.admin_users).
          // The Supabase login itself just verifies email+password — it does
          // not know about admin vs. user. We check membership against the
          // admin_users table and immediately sign out any account that is
          // not listed, so non-admins never get a valid admin session in
          // localStorage.
          const isAdmin = await isAuthenticatedUserAdmin();
          if (!isAdmin) {
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
        // localStorage (e.g. the user was demoted, or a forged token), sign
        // them out immediately on app start. The DB membership check is the
        // single source of truth.
        if (session?.user) {
          const isAdmin = await isAuthenticatedUserAdmin();
          if (!isAdmin) {
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
        }

        set({
          user: session?.user ?? null,
          session,
          loading: false,
          initialized: true,
        });

        // Listen for auth changes — re-check DB membership on every session
        // change so a token rotation cannot smuggle in a demoted user.
        supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (newSession?.user) {
            const stillAdmin = await isAuthenticatedUserAdmin();
            if (!stillAdmin) {
              void supabase.auth.signOut();
              set({ user: null, session: null });
              return;
            }
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
