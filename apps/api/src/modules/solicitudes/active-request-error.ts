/**
 * Raised when the student already has a request that is still open.
 */
export class ActiveRequestError extends Error {
  public constructor() {
    super("An active orientation request already exists for this email.");
    this.name = "ActiveRequestError";
  }
}
