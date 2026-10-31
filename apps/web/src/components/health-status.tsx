import { useEffect, useState, type ReactElement } from "react";
import { fetchHealth } from "../lib/fetch-health";

type HealthView = "loading" | "up" | "down";

/**
 * Shows whether the API can reach PostgreSQL.
 */
export function HealthStatus(): ReactElement {
  const [view, setView] = useState<HealthView>("loading");
  useEffect(() => {
    let isActive = true;
    async function loadHealth(): Promise<void> {
      try {
        const report = await fetchHealth();
        if (!isActive) {
          return;
        }
        setView(report.database === "up" ? "up" : "down");
      } catch {
        if (!isActive) {
          return;
        }
        setView("down");
      }
    }
    void loadHealth();
    return () => {
      isActive = false;
    };
  }, []);
  const label = resolveHealthLabel(view);
  return (
    <p className="text-sm text-ink/70" role="status">
      {label}
    </p>
  );
}

function resolveHealthLabel(view: HealthView): string {
  if (view === "loading") {
    return "Comprobando servicio";
  }
  if (view === "up") {
    return "Servicio en línea";
  }
  return "Servicio no disponible";
}
