import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDatabase, type DatabaseConnection } from '@agendoxa/database';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DATABASE_CONNECTION } from '../src/database/database.module.js';
import { configureHttp } from '../src/platform/http/configure-http.js';

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl || !new URL(testUrl).pathname.endsWith('_test')) {
  throw new Error(
    'DATABASE_URL_TEST must point to a dedicated database ending in _test.',
  );
}

// A uniquely named child database, migrated with the versioned SQL of
// @agendoxa/database and dropped afterwards. Development data is never used.
const databaseName = `agendoxa_api_it_${randomUUID().replaceAll('-', '')}`;
const isolatedUrl = new URL(testUrl);
isolatedUrl.pathname = `/${databaseName}`;
const databasePackage = fileURLToPath(
  new URL('../../../packages/database', import.meta.url),
);

const tenantA = { id: randomUUID(), slug: 'first-business' };
const tenantB = { id: randomUUID(), slug: 'second-business' };
const tenantWithoutServices = { id: randomUUID(), slug: 'empty-business' };

describe('public services through NestJS and PostgreSQL', () => {
  const admin = createDatabase(testUrl);
  let created = false;
  let app: INestApplication<App> | undefined;
  let connection: DatabaseConnection;

  beforeAll(async () => {
    await admin.pool.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    const migration = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/migrate.ts'],
      {
        cwd: databasePackage,
        env: { ...process.env, DATABASE_URL: isolatedUrl.toString() },
        encoding: 'utf8',
        timeout: 30_000,
      },
    );
    expect(migration.status, migration.stderr).toBe(0);

    vi.stubEnv('DATABASE_URL', isolatedUrl.toString());
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureHttp(app);
    await app.init();
    connection = app.get<DatabaseConnection>(DATABASE_CONNECTION);

    for (const tenant of [tenantA, tenantB, tenantWithoutServices]) {
      await connection.pool.query(
        "INSERT INTO tenants (id, name, slug, timezone, currency) VALUES ($1, $2, $2, 'America/Argentina/Buenos_Aires', 'ARS')",
        [tenant.id, tenant.slug],
      );
    }
    const insertService =
      'INSERT INTO services (tenant_id, name, description, duration, price, is_active) VALUES ($1, $2, $3, $4, $5, $6)';
    await connection.pool.query(insertService, [
      tenantA.id,
      'Corte',
      null,
      30,
      '7500.00',
      true,
    ]);
    await connection.pool.query(insertService, [
      tenantA.id,
      'Barba',
      'Perfilado con navaja',
      20,
      '4000.50',
      true,
    ]);
    // Sorts first by name, so a missing is_active filter cannot go unnoticed.
    await connection.pool.query(insertService, [
      tenantA.id,
      'Antiguo',
      null,
      45,
      '1000.00',
      false,
    ]);
    await connection.pool.query(insertService, [
      tenantB.id,
      'Alquiler cancha',
      null,
      60,
      '30000.00',
      true,
    ]);
    await connection.pool.query(insertService, [
      tenantWithoutServices.id,
      'Retirado',
      null,
      30,
      '0.00',
      false,
    ]);
  }, 60_000);

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      vi.unstubAllEnvs();
      try {
        if (created) {
          await admin.pool.query(
            `DROP DATABASE "${databaseName}" WITH (FORCE)`,
          );
        }
      } finally {
        await admin.close();
      }
    }
  });

  const list = (slug: string) =>
    request(app!.getHttpServer()).get(
      `/api/v1/public/businesses/${slug}/services`,
    );

  it('scopes every read to the slug tenant, alternating tenants on reused connections', async () => {
    const expectedA = [
      {
        name: 'Barba',
        description: 'Perfilado con navaja',
        durationMinutes: 20,
        price: '4000.50',
      },
      {
        name: 'Corte',
        description: null,
        durationMinutes: 30,
        price: '7500.00',
      },
    ];
    const expectedB = [
      {
        name: 'Alquiler cancha',
        description: null,
        durationMinutes: 60,
        price: '30000.00',
      },
    ];

    for (const [slug, expected] of [
      [tenantA.slug, expectedA],
      [tenantB.slug, expectedB],
      [tenantA.slug, expectedA],
      [tenantB.slug, expectedB],
    ] as const) {
      const response = await list(slug).expect(200);
      expect(response.body.items).toMatchObject(expected);
      expect(response.body.items).toHaveLength(expected.length);
    }
    // Sequential requests reuse one pooled connection, so a tenant value left
    // behind by an earlier request would have shown up above.
    expect(connection.pool.totalCount).toBe(1);
  });

  it('returns an empty list for a tenant without active services', async () => {
    await list(tenantWithoutServices.slug).expect(200).expect({ items: [] });
  });

  it('returns not_found for a slug no tenant has', async () => {
    const response = await list('missing-business').expect(404);
    expect(response.body).toMatchObject({ code: 'not_found', status: 404 });
  });
});
