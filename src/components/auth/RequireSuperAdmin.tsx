import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * Route guard for SUPER-ADMIN-only sections (Task 2): Withdrawals,
 * Ambassador Payouts, Communications, Settings.
 *
 * This is defense-in-depth — the backend independently returns 403 on the
 * APIs powering these pages (see utils/requireAdmin.js `requireSuperAdmin`).
 * Least-privilege on uncertainty: access requires an explicit 'superadmin'
 * role. An unresolved role (null — e.g. the admin RPC errored and the session
 * was accepted optimistically) is treated as NON-super and redirected; the
 * session persists the role once resolved, so this only affects the rare
 * cold-start-error window, and the backend remains the authority.
 *
 * Rendered as a layout route wrapping the protected children via <Outlet/>.
 */
export const RequireSuperAdmin = () => {
  const role = useAuthStore((s) => s.role);

  if (role !== "superadmin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RequireSuperAdmin;
