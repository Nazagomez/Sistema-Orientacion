import type { Pool, PoolClient } from "pg";
import type { OrientationRequest } from "../solicitudes/orientation-request.js";
import type { AdminRequestDetail } from "./admin-request-detail.js";
import type { AdminRequestListPage, AdminRequestRepository, AdminRequestRestoreResult, AdminRequestUpdateResult } from "./admin-request-repository.js";
import type { AdminRequestSummary } from "./admin-request-summary.js";
import type { AdminSummary } from "./admin-summary.js";
import type { ApprovedRequestRow } from "./approved-request-row.js";

type CounselorIdentity = {
  readonly correo: string;
  readonly nombre: string;
};

type ApprovedQueryRow = {
  nombre: string;
  correo: string;
  identificacion: string;
  telefono: string;
  carrera: string;
  nivel: string;
  estado: string;
  otro_tema: string | null;
  created_at: Date;
  temas: string;
};

type SummaryRow = {
  id: string;
  nombre: string;
  correo: string;
  identificacion: string;
  carrera: string;
  nivel: string;
  estado: string;
  created_at: Date;
};

/**
 * Reads and resolves orientation requests for the counselor panel.
 */
export function createPgAdminRequestRepository(pool: Pool, counselor: CounselorIdentity): AdminRequestRepository {
  return {
    summarize: () => summarize(pool),
    list: (input) => listRequests(pool, input),
    findById: (id) => findRequest(pool, id),
    applyDecision: (input) => applyDecision(pool, counselor, input),
    update: (id, request) => updateRequest(pool, id, request),
    remove: (id) => removeRequest(pool, counselor, id),
    restore: (id) => restoreRequest(pool, id),
    listApproved: () => listApproved(pool),
  };
}

async function summarize(pool: Pool): Promise<AdminSummary> {
  const counts = await pool.query<{ pendientes: number; aprobadas: number; no_aprobadas: number }>(
    `SELECT
       count(*) FILTER (WHERE estado = 'PENDIENTE')::int AS pendientes,
       count(*) FILTER (WHERE estado = 'APROBADA')::int AS aprobadas,
       count(*) FILTER (WHERE estado = 'NO_APROBADA')::int AS no_aprobadas
     FROM solicitudes
     WHERE eliminada_en IS NULL`,
  );
  const appointments = await pool.query<{ total: number }>(
    `SELECT count(*)::int AS total
     FROM citas
     INNER JOIN solicitudes ON solicitudes.id = citas.solicitud_id
     WHERE citas.estado = 'PROGRAMADA'
       AND citas.fecha >= CURRENT_DATE
       AND solicitudes.eliminada_en IS NULL`,
  );
  const row = counts.rows[0];
  return {
    pendientes: Number(row?.pendientes ?? 0),
    aprobadas: Number(row?.aprobadas ?? 0),
    noAprobadas: Number(row?.no_aprobadas ?? 0),
    citasProximas: Number(appointments.rows[0]?.total ?? 0),
  };
}

async function listRequests(
  pool: Pool,
  input: { estado: string | null; search: string | null; page: number; pageSize: number; deleted: boolean },
): Promise<AdminRequestListPage> {
  const pattern = input.search === null ? null : `%${escapeLike(input.search)}%`;
  const filters = [input.estado, pattern, input.deleted];
  const counted = await pool.query<{ total: number }>(
    `SELECT count(*)::int AS total
     FROM solicitudes
     INNER JOIN usuarios ON usuarios.id = solicitudes.usuario_id
     WHERE ($1::text IS NULL OR solicitudes.estado = $1)
       AND (
         $2::text IS NULL
         OR usuarios.nombre ILIKE $2 ESCAPE '\\'
         OR usuarios.correo ILIKE $2 ESCAPE '\\'
         OR solicitudes.identificacion ILIKE $2 ESCAPE '\\'
       )
       AND (
         ($3::boolean = true AND solicitudes.eliminada_en IS NOT NULL)
         OR ($3::boolean = false AND solicitudes.eliminada_en IS NULL)
       )`,
    filters,
  );
  const offset = (input.page - 1) * input.pageSize;
  const result = await pool.query<SummaryRow>(
    `SELECT solicitudes.id, usuarios.nombre, usuarios.correo, solicitudes.identificacion,
            solicitudes.carrera, solicitudes.nivel, solicitudes.estado, solicitudes.created_at
     FROM solicitudes
     INNER JOIN usuarios ON usuarios.id = solicitudes.usuario_id
     WHERE ($1::text IS NULL OR solicitudes.estado = $1)
       AND (
         $2::text IS NULL
         OR usuarios.nombre ILIKE $2 ESCAPE '\\'
         OR usuarios.correo ILIKE $2 ESCAPE '\\'
         OR solicitudes.identificacion ILIKE $2 ESCAPE '\\'
       )
       AND (
         ($3::boolean = true AND solicitudes.eliminada_en IS NOT NULL)
         OR ($3::boolean = false AND solicitudes.eliminada_en IS NULL)
       )
     ORDER BY solicitudes.created_at DESC
     LIMIT $4 OFFSET $5`,
    [...filters, input.pageSize, offset],
  );
  return { solicitudes: result.rows.map(toSummary), total: Number(counted.rows[0]?.total ?? 0) };
}

async function findRequest(pool: Pool, id: string): Promise<AdminRequestDetail | null> {
  const result = await pool.query<SummaryRow & { telefono: string; otro_tema: string | null; observacion_orientadora: string | null; eliminada_en: Date | null }>(
    `SELECT solicitudes.id, usuarios.nombre, usuarios.correo, solicitudes.identificacion,
            solicitudes.telefono, solicitudes.carrera, solicitudes.nivel, solicitudes.estado,
            solicitudes.otro_tema, solicitudes.observacion_orientadora, solicitudes.created_at,
            solicitudes.eliminada_en
     FROM solicitudes
     INNER JOIN usuarios ON usuarios.id = solicitudes.usuario_id
     WHERE solicitudes.id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  const temas = await pool.query<{ codigo: string; nombre: string }>(
    `SELECT temas.codigo, temas.nombre
     FROM solicitud_temas
     INNER JOIN temas ON temas.id = solicitud_temas.tema_id
     WHERE solicitud_temas.solicitud_id = $1
     ORDER BY temas.id`,
    [id],
  );
  const historial = await pool.query<{ estado_anterior: string | null; estado_nuevo: string; fecha: Date }>(
    `SELECT estado_anterior, estado_nuevo, fecha
     FROM historial_estados
     WHERE solicitud_id = $1
     ORDER BY fecha`,
    [id],
  );
  return {
    ...toSummary(row),
    telefono: row.telefono,
    otroTema: row.otro_tema,
    observacion: row.observacion_orientadora,
    temas: temas.rows.map((topic) => topic.nombre),
    temaCodigos: temas.rows.map((topic) => topic.codigo),
    eliminada: row.eliminada_en !== null,
    historial: historial.rows.map((entry) => ({
      estadoAnterior: entry.estado_anterior,
      estadoNuevo: entry.estado_nuevo,
      fecha: entry.fecha.toISOString(),
    })),
  };
}

async function applyDecision(
  pool: Pool,
  counselor: CounselorIdentity,
  input: { id: string; estado: "APROBADA" | "NO_APROBADA"; observacion: string | null },
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const orientadoraId = await ensureCounselor(client, counselor);
    const current = await client.query<{ estado: string }>(
      "SELECT estado FROM solicitudes WHERE id = $1 FOR UPDATE",
      [input.id],
    );
    const previous = current.rows[0]?.estado;
    if (previous !== "PENDIENTE") {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `UPDATE solicitudes
       SET estado = $2, observacion_orientadora = $3, orientadora_id = $4, updated_at = now()
       WHERE id = $1`,
      [input.id, input.estado, input.observacion, orientadoraId],
    );
    await client.query(
      `INSERT INTO historial_estados (solicitud_id, estado_anterior, estado_nuevo, usuario_responsable, comentario)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.id, previous, input.estado, orientadoraId, input.observacion],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureCounselor(client: PoolClient, counselor: CounselorIdentity): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO usuarios (microsoft_id, nombre, correo, rol)
     VALUES ('local:orientadora', $1, $2, 'ORIENTADORA')
     ON CONFLICT (microsoft_id) DO UPDATE
       SET nombre = EXCLUDED.nombre, correo = EXCLUDED.correo, rol = 'ORIENTADORA', updated_at = now()
     RETURNING id`,
    [counselor.nombre, counselor.correo],
  );
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error("The counselor id was not returned.");
  }
  return id;
}

async function updateRequest(
  pool: Pool,
  id: string,
  request: OrientationRequest,
): Promise<AdminRequestUpdateResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ usuario_id: string }>(
      "SELECT usuario_id FROM solicitudes WHERE id = $1 FOR UPDATE",
      [id],
    );
    const usuarioId = current.rows[0]?.usuario_id;
    if (!usuarioId) {
      await client.query("ROLLBACK");
      return "missing";
    }
    const taken = await client.query(
      "SELECT id FROM usuarios WHERE correo = $1 AND id <> $2",
      [request.correo, usuarioId],
    );
    if ((taken.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return "conflict";
    }
    await client.query(
      "UPDATE usuarios SET nombre = $2, correo = $3, updated_at = now() WHERE id = $1",
      [usuarioId, request.nombre, request.correo],
    );
    await client.query(
      `UPDATE solicitudes
       SET identificacion = $2, telefono = $3, carrera = $4, nivel = $5, otro_tema = $6, updated_at = now()
       WHERE id = $1`,
      [id, request.identificacion, request.telefono, request.carrera, request.nivel, request.otroTema],
    );
    await client.query("DELETE FROM solicitud_temas WHERE solicitud_id = $1", [id]);
    const inserted = await client.query(
      `INSERT INTO solicitud_temas (solicitud_id, tema_id)
       SELECT $1, temas.id FROM temas WHERE temas.codigo = ANY($2::text[])`,
      [id, request.temas],
    );
    if ((inserted.rowCount ?? 0) !== request.temas.length) {
      throw new Error("One or more topics are unknown.");
    }
    await client.query("COMMIT");
    return "updated";
  } catch (error) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(error)) {
      return "conflict";
    }
    throw error;
  } finally {
    client.release();
  }
}

async function removeRequest(pool: Pool, counselor: CounselorIdentity, id: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ estado: string; eliminada_en: Date | null }>(
      "SELECT estado, eliminada_en FROM solicitudes WHERE id = $1 FOR UPDATE",
      [id],
    );
    const current = existing.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return false;
    }
    if (current.eliminada_en) {
      await client.query("COMMIT");
      return true;
    }
    await client.query(
      `UPDATE citas SET estado = 'CANCELADA', updated_at = now()
       WHERE solicitud_id = $1 AND estado = 'PROGRAMADA'`,
      [id],
    );
    const nextEstado = current.estado === "CITA_AGENDADA" ? "APROBADA" : current.estado;
    await client.query(
      "UPDATE solicitudes SET eliminada_en = now(), estado = $2, updated_at = now() WHERE id = $1",
      [id, nextEstado],
    );
    if (nextEstado !== current.estado) {
      const orientadoraId = await ensureCounselor(client, counselor);
      await client.query(
        `INSERT INTO historial_estados (solicitud_id, estado_anterior, estado_nuevo, usuario_responsable, comentario)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, current.estado, nextEstado, orientadoraId, "Enviada a la bandeja de borrados"],
      );
    }
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function restoreRequest(pool: Pool, id: string): Promise<AdminRequestRestoreResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ usuario_id: string; estado: string; eliminada_en: Date | null }>(
      "SELECT usuario_id, estado, eliminada_en FROM solicitudes WHERE id = $1 FOR UPDATE",
      [id],
    );
    const current = existing.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return "missing";
    }
    if (!current.eliminada_en) {
      await client.query("COMMIT");
      return "restored";
    }
    const activeStates = ["PENDIENTE", "APROBADA", "CITA_AGENDADA"];
    if (activeStates.includes(current.estado)) {
      const taken = await client.query(
        `SELECT id FROM solicitudes
         WHERE usuario_id = $1 AND id <> $2 AND eliminada_en IS NULL AND estado = ANY($3::text[])`,
        [current.usuario_id, id, activeStates],
      );
      if ((taken.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        return "conflict";
      }
    }
    await client.query("UPDATE solicitudes SET eliminada_en = NULL, updated_at = now() WHERE id = $1", [id]);
    await client.query("COMMIT");
    return "restored";
  } catch (error) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(error)) {
      return "conflict";
    }
    throw error;
  } finally {
    client.release();
  }
}

async function listApproved(pool: Pool): Promise<ApprovedRequestRow[]> {
  const result = await pool.query<ApprovedQueryRow>(
    `SELECT usuarios.nombre, usuarios.correo, solicitudes.identificacion, solicitudes.telefono,
            solicitudes.carrera, solicitudes.nivel, solicitudes.estado, solicitudes.otro_tema,
            solicitudes.created_at,
            COALESCE(string_agg(temas.nombre, ', ' ORDER BY temas.id), '') AS temas
     FROM solicitudes
     INNER JOIN usuarios ON usuarios.id = solicitudes.usuario_id
     LEFT JOIN solicitud_temas ON solicitud_temas.solicitud_id = solicitudes.id
     LEFT JOIN temas ON temas.id = solicitud_temas.tema_id
     WHERE solicitudes.estado IN ('APROBADA', 'CITA_AGENDADA', 'FINALIZADA')
       AND solicitudes.eliminada_en IS NULL
     GROUP BY solicitudes.id, usuarios.id
     ORDER BY solicitudes.created_at DESC`,
  );
  return result.rows.map((row) => ({
    nombre: row.nombre,
    correo: row.correo,
    identificacion: row.identificacion,
    telefono: row.telefono,
    carrera: row.carrera,
    nivel: row.nivel,
    temas: row.temas,
    otroTema: row.otro_tema ?? "",
    estado: labelEstado(row.estado),
    fecha: formatExportDate(row.created_at),
  }));
}

function labelEstado(estado: string): string {
  if (estado === "APROBADA") {
    return "Aprobada";
  }
  if (estado === "CITA_AGENDADA") {
    return "Cita agendada";
  }
  if (estado === "FINALIZADA") {
    return "Finalizada";
  }
  return estado;
}

function formatExportDate(value: Date): string {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeZone: "America/Costa_Rica",
  }).format(value);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function toSummary(row: SummaryRow): AdminRequestSummary {
  return {
    id: row.id,
    nombre: row.nombre,
    correo: row.correo,
    identificacion: row.identificacion,
    carrera: row.carrera,
    nivel: row.nivel,
    estado: row.estado,
    createdAt: row.created_at.toISOString(),
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
