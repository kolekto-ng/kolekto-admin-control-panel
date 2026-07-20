import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * Route guard for SUPER-ADMIN-only sections (Task 2): Withdrawals,
 * Ambassador Payouts, Communications, Settings.
 *
 * This is defense-in-depth — the backend independently returns 403 on the
 * APIs powering these pages (see utils/requireAdmin.js `requireSuperAdmin`).
 * We only redirect on a *confirmed* 'admin' role; an unresolved role (null,
 * e.g. the admin RPC errored and the session was accepted optimistically) is
 * allowed through so a super-admin is never falsely locked out of a page —
 * the backend stays the authority.
 *
 * Rendered as a layout route wrapping the protected children via <Outlet/>.
 */
export const RequireSuperAdmin = () => {
  const role = useAuthStore((s) => s.role);

  if (role === "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RequireSuperAdmin;
