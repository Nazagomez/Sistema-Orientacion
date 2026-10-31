export type ServiceHealth = {
  readonly status: "ok" | "error";
  readonly database: "up" | "down";
  readonly checkedAt: string;
};
