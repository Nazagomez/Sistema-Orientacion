/**
 * Minimal database contract required by the health check.
 */
export type HealthDatabase = {
  query(sql: string): Promise<unknown>;
};
