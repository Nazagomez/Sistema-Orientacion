type GmailComposeInput = {
  readonly from: string;
  readonly to: string;
  readonly bcc?: string;
  readonly subject: string;
  readonly body: string;
};

/**
 * Builds a Gmail compose link opened in the sender account.
 */
export function buildGmailComposeUrl(input: GmailComposeInput): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    authuser: input.from,
    to: input.to,
    su: input.subject,
    body: input.body,
  });
  if (input.bcc) {
    params.set("bcc", input.bcc);
  }
  return `https://mail.google.com/mail/?${params.toString()}`;
}
