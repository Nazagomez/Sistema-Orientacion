import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

type SchedulePayload = {
  readonly solicitudId: string;
  readonly exp: number;
};

/**
 * Builds a signed link token so only the approved student can open the agenda.
 */
export function createScheduleToken(solicitudId: string, secret: string, now = new Date()): string {
  const payload = encodePayload({ solicitudId, exp: now.getTime() + TOKEN_TTL_MS });
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Returns the request id when the token signature and expiration are valid.
 */
export function readScheduleToken(token: string, secret: string, now = new Date()): string | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) {
    return null;
  }
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!signaturesMatch(sign(payload, secret), signature)) {
    return null;
  }
  const parsed = decodePayload(payload);
  if (!parsed || parsed.exp < now.getTime()) {
    return null;
  }
  return parsed.solicitudId;
}

function encodePayload(payload: SchedulePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(payload: string): SchedulePayload | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (typeof record.solicitudId !== "string" || typeof record.exp !== "number") {
      return null;
    }
    return { solicitudId: record.solicitudId, exp: record.exp };
  } catch {
    return null;
  }
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
