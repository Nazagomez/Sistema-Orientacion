import type { Pool, PoolClient } from "pg";
import { ActiveRequestError } from "./active-request-error.js";
import type { OrientationRequest } from "./orientation-request.js";
import type { OrientationRequestRepository } from "./orientation-request-repository.js";

const ACTIVE_STATES = ["PENDIENTE", "APROBADA", "CITA_AGENDADA"];

/**
 * Persists orientation requests in PostgreSQL.
 */
export function createPgOrientationRequestRepository(pool: Pool): OrientationRequestRepository {
  return {
    hasActiveRequest(email: string) {
      return hasActiveRequest(pool, email);
    },
    insert(request: OrientationRequest) {
      return insertOrientationRequest(pool, request);
    },
  };
}

async function hasActiveRequest(pool: Pool, email: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT solicitudes.id
     FROM solicitudes
     INNER JOIN usuarios ON usuarios.id = solicitudes.usuario_id
     WHERE usuarios.correo = $1
       AND solicitudes.estado = ANY($2::text[])
       AND solicitudes.eliminada_en IS NULL
     LIMIT 1`,
    [email, ACTIVE_STATES],
  );
  return (result.rowCount ?? 0) > 0;
}

async function insertOrientationRequest(pool: Pool, request: OrientationRequest): Promise<{ id: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const id = await insertRequestGraph(client, request);
    await client.query("COMMIT");
    return { id };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ActiveRequestError || isUniqueViolation(error)) {
      throw new ActiveRequestError();
    }
    throw error;
  } finally {
    client.release();
  }
}

async function insertRequestGraph(client: PoolClient, request: OrientationRequest): Promise<string> {
  const usuarioId = await upsertStudent(client, request);
  await assertNoActiveRequest(client, usuarioId);
  const solicitudId = await insertSolicitud(client, usuarioId, request);
  await insertTopics(client, solicitudId, request.temas);
  await insertInitialHistory(client, solicitudId, usuarioId);
  return solicitudId;
}

async function upsertStudent(client: PoolClient, request: OrientationRequest): Promise<string> {
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO usuarios (microsoft_id, nombre, correo, rol)
     VALUES ($1, $2, $3, 'ESTUDIANTE')
     ON CONFLICT (correo) DO UPDATE
     SET nombre = EXCLUDED.nombre, updated_at = now()
     RETURNING id`,
    [`local:${request.correo}`, request.nombre, request.correo],
  );
  const usuarioId = inserted.rows[0]?.id;
  if (!usuarioId) {
    throw new Error("The student id was not returned.");
  }
  await client.query("SELECT id FROM usuarios WHERE id = $1 FOR UPDATE", [usuarioId]);
  return usuarioId;
}

async function assertNoActiveRequest(client: PoolClient, usuarioId: string): Promise<void> {
  const existing = await client.query(
    `SELECT id FROM solicitudes WHERE usuario_id = $1 AND estado = ANY($2::text[]) AND eliminada_en IS NULL`,
    [usuarioId, ACTIVE_STATES],
  );
  if ((existing.rowCount ?? 0) > 0) {
    throw new ActiveRequestError();
  }
}

async function insertSolicitud(
  client: PoolClient,
  usuarioId: string,
  request: OrientationRequest,
): Promise<string> {
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO solicitudes (
       usuario_id, identificacion, telefono, carrera, nivel, otro_tema, estado
     ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE')
     RETURNING id`,
    [usuarioId, request.identificacion, request.telefono, request.carrera, request.nivel, request.otroTema],
  );
  const solicitudId = inserted.rows[0]?.id;
  if (!solicitudId) {
    throw new Error("The request id was not returned.");
  }
  return solicitudId;
}

async function insertTopics(client: PoolClient, solicitudId: string, temas: readonly string[]): Promise<void> {
  const inserted = await client.query(
    `INSERT INTO solicitud_temas (solicitud_id, tema_id)
     SELECT $1, temas.id FROM temas WHERE temas.codigo = ANY($2::text[])`,
    [solicitudId, temas],
  );
  if ((inserted.rowCount ?? 0) !== temas.length) {
    throw new Error("One or more topics are unknown.");
  }
}

async function insertInitialHistory(client: PoolClient, solicitudId: string, usuarioId: string): Promise<void> {
  await client.query(
    `INSERT INTO historial_estados (solicitud_id, estado_anterior, estado_nuevo, usuario_responsable)
     VALUES ($1, NULL, 'PENDIENTE', $2)`,
    [solicitudId, usuarioId],
  );
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
