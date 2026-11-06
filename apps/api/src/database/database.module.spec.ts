import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../app.module.js';
import type { DatabaseConnection } from '@agendoxa/database';

describe('database application lifecycle', () => {
  beforeEach(() => {
    vi.stubEnv(
      'DATABASE_URL',
      'postgres://unused:unused@127.0.0.1:1/unused_test',
    );
  });
  afterEach(() => vi.unstubAllEnvs());

  it('provides one application-scoped connection and closes it with the module', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    try {
      expect(() => module.get('DATABASE_CONNECTION')).not.toThrow();
      const connection = module.get<DatabaseConnection>('DATABASE_CONNECTION');
      expect(module.get('DATABASE_CONNECTION')).toBe(connection);
      expect(connection.pool.ended).toBe(false);
      await module.close();
      expect(connection.pool.ended).toBe(true);
    } finally {
      await module.close();
    }
  });
});
