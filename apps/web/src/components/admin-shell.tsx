import type { ReactElement, ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { clearAdminToken } from "../lib/admin-session";

type AdminShellProps = {
  readonly children: ReactNode;
};

/**
 * Counselor layout: soft side navigation and the working area.
 */
export function AdminShell({ children }: AdminShellProps): ReactElement {
  const navigate = useNavigate();
  function leave(): void {
    clearAdminToken();
    navigate("/admin/ingresar", { replace: true });
  }
  return (
    <div className="min-h-screen bg-blush text-ink md:grid md:grid-cols-[250px_1fr]">
      <aside className="flex flex-col border-b border-pink/70 bg-petal px-5 py-5 md:min-h-screen md:border-b-0 md:px-6 md:py-8">
        <p className="font-serif text-2xl leading-none text-berry">Orientación</p>
        <p className="mt-2 text-xs tracking-[0.16em] text-ink/60 uppercase">Universidad Nacional</p>
        <nav className="mt-6 flex gap-2 md:mt-10 md:flex-col">
          <AdminLink to="/admin" label="Resumen" end />
          <AdminLink to="/admin/solicitudes" label="Solicitudes" />
          <AdminLink to="/admin/calendario" label="Calendario" />
        </nav>
        <button type="button" onClick={leave} className="mt-6 rounded-2xl px-4 py-3 text-left text-sm text-ink/75 md:mt-auto">
          Cerrar sesión
        </button>
      </aside>
      <div className="min-w-0 px-4 py-6 md:px-8 md:py-10">{children}</div>
    </div>
  );
}

function AdminLink({ to, label, end = false }: { readonly to: string; readonly label: string; readonly end?: boolean }): ReactElement {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-2xl px-4 py-3 text-sm font-medium ${isActive ? "bg-white text-berry shadow-[0_6px_16px_rgb(234_126_163_/_0.16)]" : "text-ink/75"}`
      }
    >
      {label}
    </NavLink>
  );
}
