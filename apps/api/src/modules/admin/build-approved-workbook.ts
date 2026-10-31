import ExcelJS from "exceljs";
import type { ApprovedRequestRow } from "./approved-request-row.js";

/**
 * Builds an .xlsx file with one row per approved orientation request.
 */
export async function buildApprovedWorkbook(rows: readonly ApprovedRequestRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Orientación estudiantil";
  const sheet = workbook.addWorksheet("Aprobadas");
  sheet.columns = [
    { header: "Nombre", key: "nombre", width: 32 },
    { header: "Correo", key: "correo", width: 36 },
    { header: "Identificación", key: "identificacion", width: 18 },
    { header: "Teléfono", key: "telefono", width: 16 },
    { header: "Carrera", key: "carrera", width: 28 },
    { header: "Nivel", key: "nivel", width: 16 },
    { header: "Temas", key: "temas", width: 40 },
    { header: "Otro tema", key: "otroTema", width: 28 },
    { header: "Estado", key: "estado", width: 18 },
    { header: "Fecha", key: "fecha", width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow({ ...row });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
