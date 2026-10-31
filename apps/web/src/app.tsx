import type { ReactElement } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminGuard } from "./components/admin-guard";
import { AdminCalendarPage } from "./pages/admin-calendar-page";
import { AdminDashboardPage } from "./pages/admin-dashboard-page";
import { AdminLoginPage } from "./pages/admin-login-page";
import { AdminRequestCreatePage } from "./pages/admin-request-create-page";
import { AdminRequestDetailPage } from "./pages/admin-request-detail-page";
import { AdminRequestsPage } from "./pages/admin-requests-page";
import { RequestPage } from "./pages/request-page";
import { SchedulePage } from "./pages/schedule-page";

/**
 * Student form at the root, counselor panel under /admin.
 */
export function App(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RequestPage />} />
        <Route path="/agendar" element={<SchedulePage />} />
        <Route path="/admin/ingresar" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminGuard><AdminDashboardPage /></AdminGuard>} />
        <Route path="/admin/calendario" element={<AdminGuard><AdminCalendarPage /></AdminGuard>} />
        <Route path="/admin/solicitudes" element={<AdminGuard><AdminRequestsPage /></AdminGuard>} />
        <Route path="/admin/solicitudes/nueva" element={<AdminGuard><AdminRequestCreatePage /></AdminGuard>} />
        <Route path="/admin/solicitudes/:id" element={<AdminGuard><AdminRequestDetailPage /></AdminGuard>} />
      </Routes>
    </BrowserRouter>
  );
}
