type ApprovalMessageInput = {
  readonly nombre: string;
  readonly link: string;
};

type MailMessage = {
  readonly subject: string;
  readonly text: string;
};

/**
 * Text of the approval mail: the student must open the link and choose a time.
 */
export function buildApprovalEmail(input: ApprovalMessageInput): MailMessage {
  return {
    subject: "Su cita ha sido aprobada",
    text: [
      `Hola ${input.nombre}:`,
      "",
      "Su cita ha sido aprobada. Haga clic en el siguiente enlace para agendarla:",
      "",
      input.link,
    ].join("\n"),
  };
}

/**
 * Text of the rejection mail sent to the student.
 */
export function buildRejectionEmail(nombre: string, observacion: string | null): MailMessage {
  const lines = [`Hola ${nombre}:`, "", "Su solicitud de orientación no fue aprobada."];
  if (observacion) {
    lines.push("", observacion);
  }
  return { subject: "Su solicitud de orientación", text: lines.join("\n") };
}
