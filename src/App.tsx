import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "./components/layout/AdminLayout";

// Every route is its own chunk, fetched only when the admin actually
// navigates there — previously all 22 pages (plus everything they import,
// e.g. recharts pulled in by AmbassadorDetailPage) were bundled into a
// single ~895 kB chunk loaded up front on every visit, including the login
// screen and mobile connections.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const UserDetailPage = lazy(() => import("./pages/UserDetailPage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("./pages/CollectionDetailPage"));
const WithdrawalsPage = lazy(() => import("./pages/WithdrawalsPage"));
const WithdrawalDetailPage = lazy(() => import("./pages/WithdrawalDetailPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminKYCDashboard = lazy(() => import("./pages/admin_kyc_dashboard"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const FundraisingPage = lazy(() => import("./pages/FundraisingPage"));
const FundraisingDetailPage = lazy(() => import("./pages/FundraisingDetailPage"));
const KYCDetailPage = lazy(() => import("./pages/KYCDetailPage"));
const ReconcilePaymentPage = lazy(() => import("./pages/ReconcilePaymentPage"));
const AmbassadorApplicationsPage = lazy(() => import("./pages/AmbassadorApplicationsPage"));
const AmbassadorDetailPage = lazy(() => import("./pages/AmbassadorDetailPage"));
const AmbassadorWithdrawalsPage = lazy(() => import("./pages/AmbassadorWithdrawalsPage"));
const PaymentMonitoringPage = lazy(() => import("./pages/PaymentMonitoringPage"));
const PaymentMonitoringDetailPage = lazy(() => import("./pages/PaymentMonitoringDetailPage"));
const EmailCampaignsPage = lazy(() => import("./pages/communications/EmailCampaignsPage"));
const EmailCampaignBuilderPage = lazy(() => import("./pages/communications/EmailCampaignBuilderPage"));
const EmailTemplatesPage = lazy(() => import("./pages/communications/EmailTemplatesPage"));
const EmailLogsPage = lazy(() => import("./pages/communications/EmailLogsPage"));

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
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/:id" element={<UserDetailPage />} />
              <Route path="collections" element={<CollectionsPage />} />
              <Route path="collections/:id" element={<CollectionDetailPage />} />
              <Route path="withdrawals" element={<WithdrawalsPage />} />
              <Route path="withdrawals/:id" element={<WithdrawalDetailPage />} />
              <Route path="fundraising" element={<FundraisingPage />} />
              <Route path="fundraising/:id" element={<FundraisingDetailPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="kyc" element={<AdminKYCDashboard />} />
              <Route path="kyc/:userId" element={<KYCDetailPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route
                path="ambassadors"
                element={<AmbassadorApplicationsPage />}
              />
              <Route path="ambassadors/:id" element={<AmbassadorDetailPage />} />
              <Route path="ambassador-withdrawals" element={<AmbassadorWithdrawalsPage />} />
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
              <Route path="communications/campaigns" element={<EmailCampaignsPage />} />
              <Route path="communications/campaigns/:id" element={<EmailCampaignBuilderPage />} />
              <Route path="communications/templates" element={<EmailTemplatesPage />} />
              <Route path="communications/logs" element={<EmailLogsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
