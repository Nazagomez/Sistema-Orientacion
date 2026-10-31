# Sistema-Orientacion

Sistema de solicitudes y citas del Servicio de Orientación Estudiantil de la Universidad Nacional de Costa Rica.

El estudiante envía el formulario. La orientadora revisa la solicitud, agenda la cita y exporta las aprobadas. La base de datos es PostgreSQL y no guarda contraseñas en este repositorio.

## Desarrollo local

```bash
npm install
npm run db:up
npm run dev
```

El formulario queda en http://localhost:5173 y la API en http://localhost:3001. Copie `.env.example` a `.env` y complete los valores locales.

## Producción

Un solo servicio publica el formulario y la API. La base vive en Neon, que no se elimina a los 30 días.

En el servicio hay que definir:

- `DATABASE_URL`: cadena de conexión de Neon
- `JWT_SECRET`, `SCHEDULE_TOKEN_SECRET` y `CALENDAR_FEED_TOKEN`: secretos de al menos 16 caracteres
- `ADMIN_CORREO` y `ADMIN_PASSWORD`: ingreso del panel

`APP_BASE_URL` y `CORS_ORIGIN` toman la dirección pública del servicio cuando el host la entrega.
