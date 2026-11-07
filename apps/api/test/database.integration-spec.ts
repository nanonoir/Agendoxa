import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { DatabaseConnection } from '@agendoxa/database';
import { Test } from '@nestjs/testing';
import { expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DATABASE_CONNECTION } from '../src/database/database.module.js';

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

it('connects NestJS to PostgreSQL and releases the connection on shutdown', async () => {
  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl || !new URL(testUrl).pathname.endsWith('_test')) {
    throw new Error(
      'DATABASE_URL_TEST must point to a dedicated database ending in _test.',
    );
  }
  vi.stubEnv('DATABASE_URL', testUrl);
  try {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const connection = module.get<DatabaseConnection>(DATABASE_CONNECTION);
    try {
      const result = await connection.pool.query<{ connected: number }>(
        'SELECT 1 AS connected',
      );
      expect(result.rows).toEqual([{ connected: 1 }]);
    } finally {
      await module.close();
    }
    expect(connection.pool.ended).toBe(true);
  } finally {
    vi.unstubAllEnvs();
  }
});
