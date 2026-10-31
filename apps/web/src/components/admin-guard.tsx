import type { ReactElement, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { readAdminToken } from "../lib/admin-session";

type AdminGuardProps = {
  readonly children: ReactNode;
};

/**
 * Sends the counselor to sign in when this tab has no session.
 */
export function AdminGuard({ children }: AdminGuardProps): ReactElement {
  if (!readAdminToken()) {
    return <Navigate to="/admin/ingresar" replace />;
  }
  return <>{children}</>;
}
