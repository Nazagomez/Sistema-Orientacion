import { useState, type FormEvent, type ReactElement } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { loginAdmin } from "../lib/login-admin";
import { readAdminToken, saveAdminToken } from "../lib/admin-session";

/**
 * Counselor sign-in. The session stays in this browser tab.
 */
export function AdminLoginPage(): ReactElement {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  if (readAdminToken()) {
    return <Navigate to="/admin" replace />;
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    try {
      const token = await loginAdmin({ correo, contrasena });
      saveAdminToken(token);
      navigate("/admin", { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-blush px-4 py-10">
      <form className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-[0_10px_30px_rgb(234_126_163_/_0.12)]" onSubmit={(event) => void handleSubmit(event)}>
        <p className="font-serif text-3xl text-berry">Orientación</p>
        <h1 className="mt-2 text-lg text-ink">Ingreso de la orientadora</h1>
        <p className="mt-2 text-sm text-ink/70">Universidad Nacional de Costa Rica</p>
        {message ? <p className="mt-4 text-sm text-danger">{message}</p> : null}
        <label className="mt-6 block text-sm font-semibold" htmlFor="correo">
          Correo
        </label>
        <input
          id="correo"
          type="email"
          autoComplete="username"
          value={correo}
          onChange={(event) => setCorreo(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-pink bg-white px-4 py-3 text-sm outline-none focus:border-berry"
          required
        />
        <label className="mt-4 block text-sm font-semibold" htmlFor="contrasena">
          Contraseña
        </label>
        <input
          id="contrasena"
          type="password"
          autoComplete="current-password"
          value={contrasena}
          onChange={(event) => setContrasena(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-pink bg-white px-4 py-3 text-sm outline-none focus:border-berry"
          required
        />
        <button type="submit" disabled={isSaving} className="mt-6 w-full rounded-2xl bg-berry px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
          {isSaving ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
