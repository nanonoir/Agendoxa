import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '../src/client.js';
import { databaseUrl } from './environment.js';

const connection = createDatabase(databaseUrl());
try {
  await migrate(connection.db, {
    migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
  });
  console.log('Database migrations applied.');
} finally {
  await connection.close();
}
