ALTER TABLE solicitudes
  ADD COLUMN eliminada_en TIMESTAMPTZ;

DROP INDEX solicitudes_usuario_activa;

CREATE UNIQUE INDEX solicitudes_usuario_activa
  ON solicitudes (usuario_id)
  WHERE estado IN ('PENDIENTE', 'APROBADA', 'CITA_AGENDADA')
    AND eliminada_en IS NULL;
