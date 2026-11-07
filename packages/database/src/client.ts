import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

export function createDatabase(connectionString: string) {
  if (!connectionString.trim()) throw new Error('DATABASE_URL is required');

  const pool = new pg.Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
  pool.on('error', () => {
    process.emitWarning('An idle PostgreSQL connection failed.', {
      code: 'DATABASE_POOL_ERROR',
    });
  });
  const db = drizzle(pool, { schema });
  let closing: Promise<void> | undefined;

  return { db, pool, close: () => (closing ??= pool.end()) };
}

export type DatabaseConnection = ReturnType<typeof createDatabase>;
