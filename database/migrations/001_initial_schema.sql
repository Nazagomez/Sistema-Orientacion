CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  microsoft_id VARCHAR(360) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(320) NOT NULL UNIQUE,
  rol VARCHAR(32) NOT NULL CHECK (rol IN ('ESTUDIANTE', 'ORIENTADORA')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE temas (
  id SMALLINT PRIMARY KEY,
  codigo VARCHAR(64) NOT NULL UNIQUE,
  nombre VARCHAR(160) NOT NULL
);

INSERT INTO temas (id, codigo, nombre) VALUES
  (1, 'asesoria-vocacional', 'Asesoría vocacional'),
  (2, 'adaptacion-universitaria', 'Adaptación a la vida universitaria'),
  (3, 'relaciones-interpersonales', 'Relaciones interpersonales en la universidad'),
  (4, 'organizacion-tiempo', 'Organización del tiempo y hábitos de estudio'),
  (5, 'gestion-emociones', 'Gestión de emociones'),
  (6, 'resolucion-conflictos', 'Solución de conflictos'),
  (7, 'rendimiento-academico', 'Rendimiento académico'),
  (8, 'otro', 'Otro');

CREATE TABLE solicitudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios (id),
  identificacion VARCHAR(20) NOT NULL,
  telefono VARCHAR(32) NOT NULL,
  carrera VARCHAR(120) NOT NULL,
  nivel VARCHAR(40) NOT NULL,
  otro_tema VARCHAR(160),
  estado VARCHAR(32) NOT NULL DEFAULT 'PENDIENTE' CHECK (
    estado IN ('PENDIENTE', 'APROBADA', 'NO_APROBADA', 'CITA_AGENDADA', 'FINALIZADA')
  ),
  observacion_orientadora TEXT,
  orientadora_id UUID REFERENCES usuarios (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX solicitudes_usuario_activa
  ON solicitudes (usuario_id)
  WHERE estado IN ('PENDIENTE', 'APROBADA', 'CITA_AGENDADA');

CREATE TABLE solicitud_temas (
  solicitud_id UUID NOT NULL REFERENCES solicitudes (id),
  tema_id SMALLINT NOT NULL REFERENCES temas (id),
  PRIMARY KEY (solicitud_id, tema_id)
);

CREATE TABLE historial_estados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL REFERENCES solicitudes (id),
  estado_anterior VARCHAR(32),
  estado_nuevo VARCHAR(32) NOT NULL,
  usuario_responsable UUID REFERENCES usuarios (id),
  comentario TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL REFERENCES solicitudes (id),
  estudiante_id UUID NOT NULL REFERENCES usuarios (id),
  orientadora_id UUID NOT NULL REFERENCES usuarios (id),
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estado VARCHAR(32) NOT NULL CHECK (
    estado IN ('PROGRAMADA', 'CANCELADA', 'COMPLETADA', 'NO_ASISTIO')
  ),
  enlace_reunion TEXT,
  observaciones TEXT,
  evento_calendario_id TEXT,
  estado_calendario VARCHAR(32) NOT NULL DEFAULT 'PENDIENTE' CHECK (
    estado_calendario IN ('PENDIENTE', 'SINCRONIZADA', 'FALLIDA')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX citas_horario_orientadora_activo
  ON citas (orientadora_id, fecha, hora_inicio)
  WHERE estado = 'PROGRAMADA';

CREATE UNIQUE INDEX citas_solicitud_activa
  ON citas (solicitud_id)
  WHERE estado = 'PROGRAMADA';

CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL REFERENCES solicitudes (id),
  destinatario VARCHAR(320) NOT NULL,
  tipo VARCHAR(64) NOT NULL,
  estado VARCHAR(32) NOT NULL CHECK (estado IN ('ENVIADO', 'FALLIDO')),
  error TEXT,
  enviado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
