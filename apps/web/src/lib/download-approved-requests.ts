import { adminFetch } from "./admin-fetch";

/**
 * Downloads the approved requests as an Excel workbook.
 */
export async function downloadApprovedRequests(): Promise<void> {
  const response = await adminFetch("/api/admin/solicitudes/exportar");
  if (!response.ok) {
    throw new Error("No se pudo exportar el archivo.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "solicitudes-aprobadas.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
