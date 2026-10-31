import nodemailer from "nodemailer";
import type { Pool } from "pg";
import type { SchedulingSettings } from "../../config/read-scheduling-settings.js";
import { buildApprovalEmail, buildRejectionEmail } from "./approval-message.js";
import { sendFormSubmitMail } from "./send-formsubmit-mail.js";
import { createScheduleToken } from "../citas/schedule-token.js";

export type DecisionMailer = {
  notifyNewRequest(input: { readonly solicitudId: string; readonly subject: string; readonly text: string }): Promise<void>;
  notifyCounselor(input: { readonly solicitudId: string; readonly subject: string; readonly text: string }): Promise<void>;
  notifyApproved(input: { readonly solicitudId: string; readonly correo: string; readonly nombre: string }): Promise<string>;
  notifyRejected(input: {
    readonly solicitudId: string;
    readonly correo: string;
    readonly nombre: string;
    readonly observacion: string | null;
  }): Promise<void>;
};

/**
 * Sends the decision from the counselor mailbox and records the attempt.
 */
export function createDecisionMailer(pool: Pool, settings: SchedulingSettings): DecisionMailer {
  return {
    async notifyNewRequest(input) {
      await deliver(pool, settings, {
        solicitudId: input.solicitudId,
        to: settings.orientadoraCorreo,
        tipo: "NUEVA_SOLICITUD",
        subject: input.subject,
        text: input.text,
      });
    },
    async notifyCounselor(input) {
      await deliver(pool, settings, {
        solicitudId: input.solicitudId,
        to: settings.orientadoraCorreo,
        tipo: "CITA_AGENDADA",
        subject: input.subject,
        text: input.text,
      });
    },
    async notifyApproved(input) {
      const token = createScheduleToken(input.solicitudId, settings.tokenSecret);
      const link = `${settings.appBaseUrl}/agendar?token=${encodeURIComponent(token)}`;
      const message = buildApprovalEmail({ nombre: input.nombre, link });
      await deliver(pool, settings, {
        solicitudId: input.solicitudId,
        to: input.correo,
        tipo: "APROBADA",
        subject: message.subject,
        text: message.text,
      });
      return link;
    },
    async notifyRejected(input) {
      const message = buildRejectionEmail(input.nombre, input.observacion);
      await deliver(pool, settings, {
        solicitudId: input.solicitudId,
        to: input.correo,
        tipo: "NO_APROBADA",
        subject: message.subject,
        text: message.text,
      });
    },
  };
}

async function deliver(
  pool: Pool,
  settings: SchedulingSettings,
  message: { solicitudId: string; to: string; tipo: string; subject: string; text: string },
): Promise<void> {
  try {
    await sendMessage(settings, message);
    await recordNotification(pool, message, "ENVIADO", null);
    console.log(`Correo ${message.tipo} para ${message.to}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "No se pudo enviar el correo.";
    await recordNotification(pool, message, "FALLIDO", detail);
    console.error(`Correo ${message.tipo} falló para ${message.to}: ${detail}`);
  }
}

async function sendMessage(
  settings: SchedulingSettings,
  message: { to: string; tipo: string; subject: string; text: string },
): Promise<void> {
  if (!settings.smtp && (message.tipo === "NUEVA_SOLICITUD" || message.tipo === "CITA_AGENDADA")) {
    await sendFormSubmitMail({
      to: message.to,
      subject: message.subject,
      text: message.text,
      origin: settings.appBaseUrl,
    });
    return;
  }
  if (!settings.smtp) {
    throw new Error("El correo no tiene un buzón de salida configurado.");
  }
  const transport = nodemailer.createTransport({
    host: settings.smtp.host,
    port: settings.smtp.port,
    secure: settings.smtp.port === 465,
    auth: { user: settings.smtp.user, pass: settings.smtp.password },
  });
  await transport.sendMail({
    from: `"${settings.orientadoraNombre}" <${settings.orientadoraCorreo}>`,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
}

async function recordNotification(
  pool: Pool,
  message: { solicitudId: string; to: string; tipo: string },
  estado: "ENVIADO" | "FALLIDO",
  error: string | null,
): Promise<void> {
  await pool.query(
    `INSERT INTO notificaciones (solicitud_id, destinatario, tipo, estado, error)
     VALUES ($1, $2, $3, $4, $5)`,
    [message.solicitudId, message.to, message.tipo, estado, error],
  );
}
