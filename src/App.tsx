
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminLayout } from "./components/layout/AdminLayout";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/UsersPage";
import UserDetailPage from "./pages/UserDetailPage";
import CollectionsPage from "./pages/CollectionsPage";
import CollectionDetailPage from "./pages/CollectionDetailPage";
import WithdrawalsPage from "./pages/WithdrawalsPage";
import WithdrawalDetailPage from "./pages/WithdrawalDetailPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import AdminKYCDashboard from "./pages/admin_kyc_dashboard";
import TransactionsPage from "./pages/TransactionsPage";
import FundraisingPage from "./pages/FundraisingPage";
import FundraisingDetailPage from "./pages/FundraisingDetailPage";
import KYCDetailPage from "./pages/KYCDetailPage";
import ReconcilePaymentPage from "./pages/ReconcilePaymentPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            <Route path="profile" element={<ProfilePage />} />
            <Route path="reconcile" element={<ReconcilePaymentPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
