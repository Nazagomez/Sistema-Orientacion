type DatabaseSsl = {
  readonly rejectUnauthorized: true;
};

export type DatabaseConnection = {
  readonly connectionString: string;
  readonly ssl?: DatabaseSsl;
};

/**
 * Turns a database URL into pool settings.
 * Remote hosts use SSL. Neon channel binding is removed because node-postgres does not support it.
 */
export function prepareDatabaseConnection(databaseUrl: string): DatabaseConnection {
  const connectionString = removeChannelBinding(databaseUrl);
  if (!requiresSsl(connectionString)) {
    return { connectionString };
  }
  return { connectionString, ssl: { rejectUnauthorized: true } };
}

function removeChannelBinding(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.delete("channel_binding");
  return url.toString();
}

function requiresSsl(databaseUrl: string): boolean {
  const hostname = new URL(databaseUrl).hostname;
  return hostname !== "localhost" && hostname !== "127.0.0.1";
}
