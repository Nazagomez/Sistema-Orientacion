import assert from "node:assert/strict";
import { describe, it } from "node:test";
import ExcelJS from "exceljs";
import { buildApprovedWorkbook } from "./build-approved-workbook.js";

describe("approved workbook", () => {
  it("writes the approved columns and the first request", async () => {
    const buffer = await buildApprovedWorkbook([
      {
        nombre: "Ana Solis",
        correo: "ana.solis@una.cr",
        identificacion: "123456789",
        telefono: "88888888",
        carrera: "Ingeniería",
        nivel: "2",
        temas: "Asesoría vocacional",
        otroTema: "",
        estado: "Aprobada",
        fecha: "5 oct 2026",
      },
    ]);
    assert.equal(buffer.subarray(0, 2).toString("utf8"), "PK");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Aprobadas");
    assert.equal(sheet?.getCell("A1").value, "Nombre");
    assert.equal(sheet?.getCell("A2").value, "Ana Solis");
    assert.equal(sheet?.getCell("I2").value, "Aprobada");
  });
});
