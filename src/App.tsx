import { Component, Suspense, lazy, type ComponentType, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "./components/layout/AdminLayout";
import { RequireSuperAdmin } from "./components/auth/RequireSuperAdmin";

// ─────────────────────────────────────────────────────────────────────────────
// STALE-CHUNK RECOVERY
//
// Vite emits content-hashed chunk filenames (AmbassadorApplicationsPage-<hash>.js).
// Every deploy changes those hashes. A browser tab that loaded the app BEFORE a
// deploy still holds the OLD index chunk, which references the OLD filenames —
// and those files no longer exist on the server. The moment the admin navigates
// to a not-yet-loaded route, the dynamic import 404s and React throws:
//
//     TypeError: Failed to fetch dynamically imported module
//
// Only lazily-loaded routes can fail this way, which is why the failures cluster
// on pages reached after the initial load (Ambassador Applications, KYC
// dashboard, Reconcile Payment) rather than on the login screen.
//
// Recovery: on the first failure for a given chunk, force ONE full reload. That
// re-fetches index.html and with it the current chunk manifest. The sessionStorage
// guard means a genuinely broken module (not a stale hash) surfaces its real
// error on the second attempt instead of reload-looping forever.
// ─────────────────────────────────────────────────────────────────────────────
function lazyWithReload<T extends ComponentType<unknown>>(
  name: string,
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    const guardKey = `chunk-reload:${name}`;
    try {
      const mod = await factory();
      // Loaded fine — clear the guard so a FUTURE deploy can reload again.
      try { sessionStorage.removeItem(guardKey); } catch { /* private mode */ }
      return mod;
    } catch (err) {
      let alreadyRetried = true; // fail safe: if storage is unavailable, don't loop
      try { alreadyRetried = sessionStorage.getItem(guardKey) !== null; } catch { /* ignore */ }

      if (!alreadyRetried) {
        try { sessionStorage.setItem(guardKey, "1"); } catch { /* ignore */ }
        // eslint-disable-next-line no-console
        console.warn(
          `[chunk] '${name}' failed to load (likely a stale build after a deploy) — reloading once.`,
          err,
        );
        window.location.reload();
        // The document is being replaced; never resolve.
        return await new Promise<never>(() => {});
      }
      // Second failure — this is a real error, not a stale hash. Let it surface.
      throw err;
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE ERROR BOUNDARY
// Without this, a throwing route unmounts the tree and leaves a blank screen
// with only a console error. This renders an actionable recovery UI instead.
// ─────────────────────────────────────────────────────────────────────────────
class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[route] failed to render:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 px-6 text-center">
        <h2 className="text-lg font-semibold">This page failed to load</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {this.state.error.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-kolekto-orange px-4 py-2 text-sm font-medium text-white"
        >
          Reload page
        </button>
      </div>
    );
  }
}

// Every route is its own chunk, fetched only when the admin actually
// navigates there — previously all 22 pages (plus everything they import,
// e.g. recharts pulled in by AmbassadorDetailPage) were bundled into a
// single ~895 kB chunk loaded up front on every visit, including the login
// screen and mobile connections.
const Dashboard = lazyWithReload("Dashboard", () => import("./pages/Dashboard"));
const UsersPage = lazyWithReload("UsersPage", () => import("./pages/UsersPage"));
const UserDetailPage = lazyWithReload("UserDetailPage", () => import("./pages/UserDetailPage"));
const CollectionsPage = lazyWithReload("CollectionsPage", () => import("./pages/CollectionsPage"));
const CollectionDetailPage = lazyWithReload("CollectionDetailPage", () => import("./pages/CollectionDetailPage"));
const WithdrawalsPage = lazyWithReload("WithdrawalsPage", () => import("./pages/WithdrawalsPage"));
const WithdrawalDetailPage = lazyWithReload("WithdrawalDetailPage", () => import("./pages/WithdrawalDetailPage"));
const NotificationsPage = lazyWithReload("NotificationsPage", () => import("./pages/NotificationsPage"));
const SettingsPage = lazyWithReload("SettingsPage", () => import("./pages/SettingsPage"));
const ProfilePage = lazyWithReload("ProfilePage", () => import("./pages/ProfilePage"));
const LoginPage = lazyWithReload("LoginPage", () => import("./pages/LoginPage"));
const NotFound = lazyWithReload("NotFound", () => import("./pages/NotFound"));
const AdminKYCDashboard = lazyWithReload("AdminKYCDashboard", () => import("./pages/admin_kyc_dashboard"));
const TransactionsPage = lazyWithReload("TransactionsPage", () => import("./pages/TransactionsPage"));
const FundraisingPage = lazyWithReload("FundraisingPage", () => import("./pages/FundraisingPage"));
const FundraisingDetailPage = lazyWithReload("FundraisingDetailPage", () => import("./pages/FundraisingDetailPage"));
const KYCDetailPage = lazyWithReload("KYCDetailPage", () => import("./pages/KYCDetailPage"));
const ReconcilePaymentPage = lazyWithReload("ReconcilePaymentPage", () => import("./pages/ReconcilePaymentPage"));
const AmbassadorApplicationsPage = lazyWithReload("AmbassadorApplicationsPage", () => import("./pages/AmbassadorApplicationsPage"));
const AmbassadorDetailPage = lazyWithReload("AmbassadorDetailPage", () => import("./pages/AmbassadorDetailPage"));
const AmbassadorWithdrawalsPage = lazyWithReload("AmbassadorWithdrawalsPage", () => import("./pages/AmbassadorWithdrawalsPage"));
const PaymentMonitoringPage = lazyWithReload("PaymentMonitoringPage", () => import("./pages/PaymentMonitoringPage"));
const PaymentMonitoringDetailPage = lazyWithReload("PaymentMonitoringDetailPage", () => import("./pages/PaymentMonitoringDetailPage"));
const EmailCampaignsPage = lazyWithReload("EmailCampaignsPage", () => import("./pages/communications/EmailCampaignsPage"));
const EmailCampaignBuilderPage = lazyWithReload("EmailCampaignBuilderPage", () => import("./pages/communications/EmailCampaignBuilderPage"));
const EmailTemplatesPage = lazyWithReload("EmailTemplatesPage", () => import("./pages/communications/EmailTemplatesPage"));
const EmailLogsPage = lazyWithReload("EmailLogsPage", () => import("./pages/communications/EmailLogsPage"));

const queryClient = new QueryClient();

function RouteLoadingFallback() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-kolekto-orange" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteErrorBoundary>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/:id" element={<UserDetailPage />} />
              <Route path="collections" element={<CollectionsPage />} />
              <Route path="collections/:id" element={<CollectionDetailPage />} />
              <Route path="fundraising" element={<FundraisingPage />} />
              <Route path="fundraising/:id" element={<FundraisingDetailPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="kyc" element={<AdminKYCDashboard />} />
              <Route path="kyc/:userId" element={<KYCDetailPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route
                path="ambassadors"
                element={<AmbassadorApplicationsPage />}
              />
              <Route path="ambassadors/:id" element={<AmbassadorDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="reconcile" element={<ReconcilePaymentPage />} />
              <Route
                path="payment-monitoring"
                element={<PaymentMonitoringPage />}
              />
              <Route
                path="payment-monitoring/:reference"
                element={<PaymentMonitoringDetailPage />}
              />

              {/* ── SUPER-ADMIN ONLY (Task 2) ───────────────────────────────
                  Withdrawals, Ambassador Payouts, Communications, Settings.
                  Backend independently 403s the APIs behind these; this guard
                  hides the pages from a plain 'admin'. */}
              <Route element={<RequireSuperAdmin />}>
                <Route path="withdrawals" element={<WithdrawalsPage />} />
                <Route path="withdrawals/:id" element={<WithdrawalDetailPage />} />
                <Route path="ambassador-withdrawals" element={<AmbassadorWithdrawalsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="communications/campaigns" element={<EmailCampaignsPage />} />
                <Route path="communications/campaigns/:id" element={<EmailCampaignBuilderPage />} />
                <Route path="communications/templates" element={<EmailTemplatesPage />} />
                <Route path="communications/logs" element={<EmailLogsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </RouteErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
