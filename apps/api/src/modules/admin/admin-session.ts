import { createHash, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

const TOKEN_TTL_SECONDS = 12 * 60 * 60;

/**
 * Signs a counselor session that expires in twelve hours.
 */
export function signAdminToken(correo: string, secret: string): string {
  return jwt.sign({ rol: "ORIENTADORA" }, secret, { subject: correo, expiresIn: TOKEN_TTL_SECONDS });
}

/**
 * Returns the counselor email when the token signature and expiry are valid.
 */
export function readAdminSubject(token: string, secret: string): string | null {
  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

/**
 * Compares two passwords without leaking which one is longer.
 */
export function passwordsMatch(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}
