import type { Pool, PoolClient } from "pg";
import type {
  AppointmentRepository,
  RescheduleResult,
  SchedulableRequest,
  ScheduleApprovedResult,
  StoredAppointment,
} from "./appointment-repository.js";

type RequestRow = {
  id: string;
  estudiante_id: string;
  orientadora_id: string | null;
  estado: string;
  nombre: string;
  correo: string;
};

/**
 * Stores appointments and reads the counselor's occupied hours.
 */
export function createPgAppointmentRepository(pool: Pool): AppointmentRepository {
  return {
    findSchedulable: (solicitudId) => findSchedulable(pool, solicitudId),
    listOccupied: (orientadoraId) => listOccupied(pool, orientadoraId),
    listScheduleKeys: (exceptCitaId) => listScheduleKeys(pool, exceptCitaId),
    listUpcoming: () => listUpcoming(pool),
    scheduleApproved: (input) => scheduleApproved(pool, input),
    updateComment: (id, comentario) => updateComment(pool, id, comentario),
    reschedule: (input) => rescheduleAppointment(pool, input),
    close: (input) => closeAppointment(pool, input),
    book: (input) => bookAppointment(pool, input),
  };
}

async function findSchedulable(pool: Pool, solicitudId: string): Promise<SchedulableRequest | null> {
  const result = await pool.query<RequestRow>(
    `SELECT solicitudes.id, solicitudes.usuario_id AS estudiante_id, solicitudes.orientadora_id,
            solicitudes.estado, usuarios.nombre, usuarios.correo
     FROM solicitudes
     INNER JOIN usuarios ON usuarios.id = solicitudes.usuario_id
     WHERE solicitudes.id = $1 AND solicitudes.eliminada_en IS NULL`,
    [solicitudId],
  );
  const row = result.rows[0];
  if (!row || !row.orientadora_id) {
    return null;
  }
  return {
    id: row.id,
    estudianteId: row.estudiante_id,
    orientadoraId: row.orientadora_id,
    estado: row.estado,
    nombre: row.nombre,
    correo: row.correo,
  };
}

async function listOccupied(pool: Pool, orientadoraId: string): Promise<string[]> {
  const result = await pool.query<{ fecha: string; hora: string }>(
    `SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, to_char(hora_inicio, 'HH24:MI') AS hora
     FROM citas
     INNER JOIN solicitudes ON solicitudes.id = citas.solicitud_id
     WHERE citas.orientadora_id = $1
       AND citas.estado = 'PROGRAMADA'
       AND citas.fecha >= CURRENT_DATE
       AND solicitudes.eliminada_en IS NULL`,
    [orientadoraId],
  );
  return result.rows.map((row) => `${row.fecha}|${row.hora}`);
}

async function listScheduleKeys(pool: Pool, exceptCitaId: string | null): Promise<string[]> {
  const result = await pool.query<{ fecha: string; hora: string }>(
    `SELECT to_char(citas.fecha, 'YYYY-MM-DD') AS fecha, to_char(citas.hora_inicio, 'HH24:MI') AS hora
     FROM citas
     INNER JOIN solicitudes ON solicitudes.id = citas.solicitud_id
     WHERE citas.estado = 'PROGRAMADA'
       AND citas.fecha >= CURRENT_DATE
       AND solicitudes.eliminada_en IS NULL
       AND ($1::uuid IS NULL OR citas.id <> $1)`,
    [exceptCitaId],
  );
  return result.rows.map((row) => `${row.fecha}|${row.hora}`);
}

async function listUpcoming(pool: Pool): Promise<StoredAppointment[]> {
  const result = await pool.query<{
    id: string;
    solicitud_id: string;
    nombre: string;
    correo: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    observaciones: string | null;
  }>(
    `SELECT citas.id, citas.solicitud_id, usuarios.nombre, usuarios.correo,
            to_char(citas.fecha, 'YYYY-MM-DD') AS fecha,
            to_char(citas.hora_inicio, 'HH24:MI') AS hora_inicio,
            to_char(citas.hora_fin, 'HH24:MI') AS hora_fin,
            citas.observaciones
     FROM citas
     INNER JOIN usuarios ON usuarios.id = citas.estudiante_id
     INNER JOIN solicitudes ON solicitudes.id = citas.solicitud_id
     WHERE citas.estado = 'PROGRAMADA'
       AND citas.fecha >= CURRENT_DATE
       AND solicitudes.eliminada_en IS NULL
     ORDER BY citas.fecha, citas.hora_inicio`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    solicitudId: row.solicitud_id,
    nombre: row.nombre,
    correo: row.correo,
    fecha: row.fecha,
    horaInicio: row.hora_inicio,
    horaFin: row.hora_fin,
    comentario: row.observaciones ?? "",
  }));
}

async function scheduleApproved(
  pool: Pool,
  input: {
    solicitudId: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    comentario: string | null;
    googleCalendarUrl: string;
  },
): Promise<ScheduleApprovedResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query<{ usuario_id: string; orientadora_id: string | null; estado: string }>(
      "SELECT usuario_id, orientadora_id, estado FROM solicitudes WHERE id = $1 AND eliminada_en IS NULL FOR UPDATE",
      [input.solicitudId],
    );
    const current = locked.rows[0];
    if (!current || current.estado !== "APROBADA") {
      await client.query("ROLLBACK");
      return current ? "not-approved" : "missing";
    }
    const orientadoraId = current.orientadora_id ?? (await findCounselorId(client));
    if (!orientadoraId) {
      await client.query("ROLLBACK");
      return "missing";
    }
    if (!current.orientadora_id) {
      await client.query("UPDATE solicitudes SET orientadora_id = $2, updated_at = now() WHERE id = $1", [
        input.solicitudId,
        orientadoraId,
      ]);
    }
    await client.query(
      `INSERT INTO citas (
         solicitud_id, estudiante_id, orientadora_id, fecha, hora_inicio, hora_fin,
         estado, enlace_reunion, observaciones, estado_calendario
       ) VALUES ($1, $2, $3, $4, $5, $6, 'PROGRAMADA', $7, $8, 'PENDIENTE')`,
      [
        input.solicitudId,
        current.usuario_id,
        orientadoraId,
        input.fecha,
        input.horaInicio,
        input.horaFin,
        input.googleCalendarUrl,
        input.comentario,
      ],
    );
    await client.query("UPDATE solicitudes SET estado = 'CITA_AGENDADA', updated_at = now() WHERE id = $1", [input.solicitudId]);
    await client.query(
      `INSERT INTO historial_estados (solicitud_id, estado_anterior, estado_nuevo, usuario_responsable, comentario)
       VALUES ($1, 'APROBADA', 'CITA_AGENDADA', $2, $3)`,
      [input.solicitudId, orientadoraId, input.comentario],
    );
    await client.query("COMMIT");
    return "booked";
  } catch (error) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(error)) {
      return "unavailable";
    }
    throw error;
  } finally {
    client.release();
  }
}

async function updateComment(pool: Pool, id: string, comentario: string | null): Promise<boolean> {
  const updated = await pool.query(
    `UPDATE citas SET observaciones = $2, updated_at = now()
     WHERE id = $1 AND estado = 'PROGRAMADA'`,
    [id, comentario],
  );
  return (updated.rowCount ?? 0) > 0;
}

async function rescheduleAppointment(
  pool: Pool,
  input: { id: string; fecha: string; horaInicio: string; horaFin: string; googleCalendarUrl: string },
): Promise<RescheduleResult> {
  try {
    const updated = await pool.query(
      `UPDATE citas
       SET fecha = $2, hora_inicio = $3, hora_fin = $4, enlace_reunion = $5, updated_at = now()
       WHERE id = $1 AND estado = 'PROGRAMADA'`,
      [input.id, input.fecha, input.horaInicio, input.horaFin, input.googleCalendarUrl],
    );
    if ((updated.rowCount ?? 0) === 0) {
      return "missing";
    }
    return "rescheduled";
  } catch (error) {
    if (isUniqueViolation(error)) {
      return "unavailable";
    }
    throw error;
  }
}

async function findCounselorId(client: PoolClient): Promise<string | null> {
  const result = await client.query<{ id: string }>(
    "SELECT id FROM usuarios WHERE rol = 'ORIENTADORA' ORDER BY created_at LIMIT 1",
  );
  return result.rows[0]?.id ?? null;
}

async function bookAppointment(
  pool: Pool,
  input: {
    request: SchedulableRequest;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    googleCalendarUrl: string;
  },
): Promise<"booked" | "unavailable" | "not-approved"> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query<{ estado: string }>(
      "SELECT estado FROM solicitudes WHERE id = $1 FOR UPDATE",
      [input.request.id],
    );
    if (locked.rows[0]?.estado !== "APROBADA") {
      await client.query("ROLLBACK");
      return "not-approved";
    }
    await client.query(
      `INSERT INTO citas (
         solicitud_id, estudiante_id, orientadora_id, fecha, hora_inicio, hora_fin,
         estado, enlace_reunion, estado_calendario
       ) VALUES ($1, $2, $3, $4, $5, $6, 'PROGRAMADA', $7, 'PENDIENTE')`,
      [
        input.request.id,
        input.request.estudianteId,
        input.request.orientadoraId,
        input.fecha,
        input.horaInicio,
        input.horaFin,
        input.googleCalendarUrl,
      ],
    );
    await client.query(
      "UPDATE solicitudes SET estado = 'CITA_AGENDADA', updated_at = now() WHERE id = $1",
      [input.request.id],
    );
    await client.query(
      `INSERT INTO historial_estados (solicitud_id, estado_anterior, estado_nuevo, usuario_responsable)
       VALUES ($1, 'APROBADA', 'CITA_AGENDADA', $2)`,
      [input.request.id, input.request.estudianteId],
    );
    await client.query("COMMIT");
    return "booked";
  } catch (error) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(error)) {
      return "unavailable";
    }
    throw error;
  } finally {
    client.release();
  }
}

async function closeAppointment(
  pool: Pool,
  input: {
    id: string;
    citaEstado: "COMPLETADA" | "NO_ASISTIO" | "CANCELADA";
    solicitudEstado: "FINALIZADA" | "APROBADA";
  },
): Promise<{ solicitudId: string; solicitudEstado: "FINALIZADA" | "APROBADA" } | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const closed = await client.query<{ solicitud_id: string; orientadora_id: string }>(
      `UPDATE citas
       SET estado = $2, updated_at = now()
       WHERE id = $1 AND estado = 'PROGRAMADA'
       RETURNING solicitud_id, orientadora_id`,
      [input.id, input.citaEstado],
    );
    const row = closed.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query(
      "UPDATE solicitudes SET estado = $2, updated_at = now() WHERE id = $1",
      [row.solicitud_id, input.solicitudEstado],
    );
    await client.query(
      `INSERT INTO historial_estados (solicitud_id, estado_anterior, estado_nuevo, usuario_responsable)
       VALUES ($1, 'CITA_AGENDADA', $2, $3)`,
      [row.solicitud_id, input.solicitudEstado, row.orientadora_id],
    );
    await client.query("COMMIT");
    return { solicitudId: row.solicitud_id, solicitudEstado: input.solicitudEstado };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
