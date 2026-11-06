import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg, { type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import * as databasePackage from '../src/index.js';

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl || !new URL(testUrl).pathname.endsWith('_test')) {
  throw new Error(
    'DATABASE_URL_TEST must point to a dedicated database ending in _test.',
  );
}

const databaseName = `agendoxa_it_${randomUUID().replaceAll('-', '')}`;
const isolatedUrl = new URL(testUrl);
isolatedUrl.pathname = `/${databaseName}`;
const admin = new pg.Pool({ connectionString: testUrl, max: 1 });
const pool = new pg.Pool({ connectionString: isolatedUrl.toString(), max: 4 });
const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
let created = false;
type TenantFixture = {
  tenant: string;
  role: string;
  member: string;
  customer: string;
  service: string;
  resource: string;
};
let first: TenantFixture;
let second: TenantFixture;

async function tenantFixture(
  slug: string,
  user: string,
): Promise<TenantFixture> {
  const f = {
    tenant: randomUUID(),
    role: randomUUID(),
    member: randomUUID(),
    customer: randomUUID(),
    service: randomUUID(),
    resource: randomUUID(),
  };
  await pool.query(
    'INSERT INTO tenants (id, name, slug, timezone, currency) VALUES ($1, $2, $2, $3, $4)',
    [f.tenant, slug, 'America/Argentina/Buenos_Aires', 'ARS'],
  );
  await pool.query(
    "INSERT INTO roles (id, tenant_id, name, system_key, is_protected) VALUES ($1, $2, 'Admin', 'ADMIN', true)",
    [f.role, f.tenant],
  );
  await pool.query(
    'INSERT INTO tenant_memberships (id, tenant_id, user_id, role_id) VALUES ($1, $2, $3, $4)',
    [f.member, f.tenant, user, f.role],
  );
  await pool.query(
    'INSERT INTO customers (id, tenant_id, full_name, phone) VALUES ($1, $2, $3, $4)',
    [f.customer, f.tenant, 'Integration customer', '+5493624000000'],
  );
  await pool.query(
    "INSERT INTO services (id, tenant_id, name, duration, price) VALUES ($1, $2, 'Service', 30, '7500.00')",
    [f.service, f.tenant],
  );
  await pool.query(
    "INSERT INTO resources (id, tenant_id, name, kind) VALUES ($1, $2, 'Resource', 'PROFESSIONAL')",
    [f.resource, f.tenant],
  );
  await pool.query(
    'INSERT INTO service_resources (tenant_id, service_id, resource_id) VALUES ($1, $2, $3)',
    [f.tenant, f.service, f.resource],
  );
  return f;
}

async function inTransaction(run: (client: PoolClient) => Promise<void>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await run(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

async function booking(
  client: Pick<PoolClient, 'query'>,
  f = first,
  status = 'CONFIRMED',
) {
  const id = randomUUID();
  await client.query(
    `INSERT INTO bookings (id, tenant_id, customer_id, service_id, status, origin, agreed_price, notice_snapshot, collection_mode_snapshot, created_by_membership_id)
     VALUES ($1, $2, $3, $4, $5, 'CRM', '7500.00', 600, 'ALL_PROFESSIONAL', $6)`,
    [id, f.tenant, f.customer, f.service, status, f.member],
  );
  return id;
}

async function claim(
  client: Pick<PoolClient, 'query'>,
  bookingId: string,
  start = '2030-01-01T10:00:00Z',
  end = '2030-01-01T11:00:00Z',
  f = first,
  kind = 'BOOKING',
) {
  const id = randomUUID();
  await client.query(
    'INSERT INTO slot_claims (id, tenant_id, resource_id, booking_id, start_at, end_at, kind) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, f.tenant, f.resource, bookingId, start, end, kind],
  );
  return id;
}

describe('versioned core persistence', () => {
  beforeAll(async () => {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    expect(
      existsSync(`${migrationsFolder}/meta/_journal.json`),
      'Versioned migrations must exist',
    ).toBe(true);
    await migrate(drizzle(pool), { migrationsFolder });
    const user = randomUUID();
    await pool.query(
      "INSERT INTO users (id, email, full_name) VALUES ($1, 'shared@example.test', 'Shared person')",
      [user],
    );
    first = await tenantFixture('first-test-business', user);
    second = await tenantFixture('second-test-business', user);
  });

  afterAll(async () => {
    await pool.end();
    try {
      if (created) await admin.query(`DROP DATABASE "${databaseName}"`);
    } finally {
      await admin.end();
    }
  });

  it('creates the 17 core tables from an empty database', async () => {
    const result = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
    );
    expect(result.rows[0].count).toBe(17);
  });

  it('can apply the same migration chain twice without changing the schema', async () => {
    await migrate(drizzle(pool), { migrationsFolder });
    const result = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
    );
    expect(result.rows[0].count).toBe(17);
  });

  it('provides a typed Drizzle connection and releases its pool', async () => {
    expect(databasePackage).toHaveProperty(
      'createDatabase',
      expect.any(Function),
    );
    const connection = databasePackage.createDatabase(isolatedUrl.toString());
    try {
      const rows = await connection.db
        .select({ name: databasePackage.tenants.name })
        .from(databasePackage.tenants);
      expect(rows.map((row) => row.name).sort()).toEqual([
        'first-test-business',
        'second-test-business',
      ]);
    } finally {
      await connection.close();
    }
    await connection.close();
    expect(connection.pool.ended).toBe(true);
  });

  it('requires an explicit database URL instead of connecting with ambient defaults', () => {
    expect(databasePackage).toHaveProperty(
      'createDatabase',
      expect.any(Function),
    );
    expect(() => databasePackage.createDatabase('')).toThrow(
      'DATABASE_URL is required',
    );
  });

  it('reports idle pool errors without throwing or exposing the raw error', async () => {
    const connection = databasePackage.createDatabase(isolatedUrl.toString());
    const warning = vi
      .spyOn(process, 'emitWarning')
      .mockImplementation(() => undefined);
    try {
      expect(() =>
        connection.pool.emit('error', new Error('sensitive driver details')),
      ).not.toThrow();
      expect(warning).toHaveBeenCalledWith(
        'An idle PostgreSQL connection failed.',
        { code: 'DATABASE_POOL_ERROR' },
      );
    } finally {
      warning.mockRestore();
      await connection.close();
    }
  });

  it('seeds two distinct demo businesses twice without duplicating or overwriting rows', async () => {
    const runSeed = () =>
      spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed.ts'], {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        env: {
          ...process.env,
          NODE_ENV: 'development',
          DATABASE_URL: isolatedUrl.toString(),
        },
        encoding: 'utf8',
        timeout: 15_000,
      });
    const initial = runSeed();
    expect(initial.status, initial.stderr).toBe(0);
    const counts = () =>
      pool.query(
        'SELECT (SELECT count(*)::int FROM tenants) AS tenants, (SELECT count(*)::int FROM customers) AS customers, (SELECT count(*)::int FROM tenant_memberships) AS members, (SELECT count(*)::int FROM availability_rules) AS hours',
      );
    const before = await counts();
    const repeat = runSeed();
    expect(repeat.status, repeat.stderr).toBe(0);
    expect((await counts()).rows).toEqual(before.rows);
    const demo = await pool.query(
      "SELECT r.kind, u.credential_ref FROM tenants t JOIN resources r ON r.tenant_id = t.id JOIN tenant_memberships m ON m.tenant_id = t.id JOIN users u ON u.id = m.user_id WHERE t.slug IN ('demo-barber', 'demo-club') ORDER BY r.kind",
    );
    expect(demo.rows).toEqual([
      { kind: 'PROFESSIONAL', credential_ref: null },
      { kind: 'PHYSICAL', credential_ref: null },
    ]);
  });

  it('refuses to run the development seed in production', () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/seed.ts'],
      {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          DATABASE_URL: isolatedUrl.toString(),
        },
        encoding: 'utf8',
        timeout: 15_000,
      },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'Development seed requires NODE_ENV=development',
    );
  });

  it('allows one global user to have distinct roles/memberships in two businesses', async () => {
    const result = await pool.query(
      "SELECT m.user_id, count(DISTINCT m.tenant_id)::int AS tenants FROM tenant_memberships m JOIN users u ON u.id = m.user_id WHERE u.email = 'shared@example.test' GROUP BY m.user_id",
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].tenants).toBe(2);
  });

  it('allows the same normalized phone in two businesses', async () => {
    const result = await pool.query(
      "SELECT count(*)::int AS count FROM customers WHERE phone = '+5493624000000'",
    );
    expect(result.rows[0].count).toBe(2);
  });

  it('rejects a duplicate phone inside one business', async () => {
    await inTransaction(async (client) => {
      await expect(
        client.query(
          'INSERT INTO customers (tenant_id, full_name, phone) VALUES ($1, $2, $3)',
          [first.tenant, 'Duplicate', '+5493624000000'],
        ),
      ).rejects.toMatchObject({ code: '23505' });
    });
  });

  it('keeps different walk-ins without phone as separate customers', async () => {
    await inTransaction(async (client) => {
      const result = await client.query(
        "INSERT INTO customers (tenant_id, full_name) VALUES ($1, 'Same name'), ($1, 'Same name') RETURNING id, phone",
        [first.tenant],
      );
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].id).not.toBe(result.rows[1].id);
      expect(result.rows.every((row) => row.phone === null)).toBe(true);
    });
  });

  it.each(['ADMIN', 'STAFF'])(
    'rejects creating an inactive %s system role',
    async (systemKey) => {
      await inTransaction(async (client) => {
        const tenant = await client.query(
          "INSERT INTO tenants (name, slug, timezone, currency) VALUES ('Role test', $1, 'America/Argentina/Buenos_Aires', 'ARS') RETURNING id",
          [randomUUID()],
        );
        await expect(
          client.query(
            "INSERT INTO roles (tenant_id, name, system_key, is_protected, is_active) VALUES ($1, 'System role', $2, true, false)",
            [tenant.rows[0].id, systemKey],
          ),
        ).rejects.toMatchObject({
          code: '23514',
          constraint: 'roles_system_active',
        });
      });
    },
  );

  it.each(['ADMIN', 'STAFF'])(
    'rejects deactivating an existing %s system role',
    async (systemKey) => {
      await inTransaction(async (client) => {
        let roleId = first.role;
        if (systemKey === 'STAFF') {
          const role = await client.query(
            "INSERT INTO roles (tenant_id, name, system_key) VALUES ($1, 'Staff', 'STAFF') RETURNING id",
            [first.tenant],
          );
          roleId = role.rows[0].id;
        }
        await expect(
          client.query('UPDATE roles SET is_active = false WHERE id = $1', [
            roleId,
          ]),
        ).rejects.toMatchObject({
          code: '23514',
          constraint: 'roles_system_active',
        });
      });
    },
  );

  it('allows custom roles to be created inactive and deactivated', async () => {
    await inTransaction(async (client) => {
      const role = await client.query(
        "INSERT INTO roles (tenant_id, name, is_active) VALUES ($1, 'Custom', false) RETURNING id, is_active",
        [first.tenant],
      );
      expect(role.rows[0].is_active).toBe(false);
      await client.query('UPDATE roles SET is_active = true WHERE id = $1', [
        role.rows[0].id,
      ]);
      const result = await client.query(
        'UPDATE roles SET is_active = false WHERE id = $1 RETURNING is_active',
        [role.rows[0].id],
      );
      expect(result.rows[0].is_active).toBe(false);
    });
  });

  it.each([
    ['WhatsApp member author', 'WHATSAPP', null, 'bookings_whatsapp_author'],
    ['attendee phone', 'CRM', 'not-a-phone', 'bookings_attendee_phone_e164'],
  ])(
    'rejects inserting a booking with an invalid %s',
    async (_, origin, phone, constraint) => {
      await inTransaction(async (client) => {
        await expect(
          client.query(
            "INSERT INTO bookings (tenant_id, customer_id, service_id, status, origin, agreed_price, notice_snapshot, collection_mode_snapshot, created_by_membership_id, attendee_phone) VALUES ($1, $2, $3, 'CONFIRMED', $4, '7500.00', 600, 'ALL_PROFESSIONAL', $5, $6)",
            [
              first.tenant,
              first.customer,
              first.service,
              origin,
              first.member,
              phone,
            ],
          ),
        ).rejects.toMatchObject({ code: '23514', constraint });
      });
    },
  );

  it('rejects changing a CRM booking to WhatsApp while retaining a member author', async () => {
    await inTransaction(async (client) => {
      const id = await booking(client);
      await expect(
        client.query("UPDATE bookings SET origin = 'WHATSAPP' WHERE id = $1", [
          id,
        ]),
      ).rejects.toMatchObject({
        code: '23514',
        constraint: 'bookings_whatsapp_author',
      });
    });
  });

  it('allows WhatsApp bookings without a member author while preserving the CRM author requirement', async () => {
    await inTransaction(async (client) => {
      const id = await booking(client);
      const result = await client.query(
        "UPDATE bookings SET origin = 'WHATSAPP', created_by_membership_id = null WHERE id = $1 RETURNING origin, created_by_membership_id",
        [id],
      );
      expect(result.rows).toEqual([
        { origin: 'WHATSAPP', created_by_membership_id: null },
      ]);
      await expect(
        client.query("UPDATE bookings SET origin = 'CRM' WHERE id = $1", [id]),
      ).rejects.toMatchObject({
        code: '23514',
        constraint: 'bookings_crm_author',
      });
    });
  });

  it.each([
    'not-a-phone',
    '5491100000000',
    '+0491100000000',
    '+1234567890123456',
  ])('rejects changing an attendee phone to %s', async (phone) => {
    await inTransaction(async (client) => {
      const id = await booking(client);
      await expect(
        client.query('UPDATE bookings SET attendee_phone = $1 WHERE id = $2', [
          phone,
          id,
        ]),
      ).rejects.toMatchObject({
        code: '23514',
        constraint: 'bookings_attendee_phone_e164',
      });
    });
  });

  it.each([null, '+5491100000000'])(
    'allows the optional attendee phone %s',
    async (phone) => {
      await inTransaction(async (client) => {
        const id = await booking(client);
        const result = await client.query(
          'UPDATE bookings SET attendee_phone = $1 WHERE id = $2 RETURNING attendee_phone',
          [phone, id],
        );
        expect(result.rows[0].attendee_phone).toBe(phone);
      });
    },
  );

  it.each([
    'role',
    'service-resource',
    'customer',
    'service',
    'author',
    'claim-resource',
    'claim-booking',
    'cursor',
    'calendar',
    'policy',
    'event-actor',
  ])('rejects a cross-business %s reference', async (relation) => {
    await inTransaction(async (client) => {
      const ownBooking = await booking(client);
      const otherBooking = await booking(client, second);
      const statements: Record<string, [string, string[]]> = {
        role: [
          'UPDATE tenant_memberships SET role_id = $1 WHERE id = $2',
          [second.role, first.member],
        ],
        'service-resource': [
          'INSERT INTO service_resources (tenant_id, service_id, resource_id) VALUES ($1, $2, $3)',
          [first.tenant, first.service, second.resource],
        ],
        customer: [
          'UPDATE bookings SET customer_id = $1 WHERE id = $2',
          [second.customer, ownBooking],
        ],
        service: [
          'UPDATE bookings SET service_id = $1 WHERE id = $2',
          [second.service, ownBooking],
        ],
        author: [
          'UPDATE bookings SET created_by_membership_id = $1 WHERE id = $2',
          [second.member, ownBooking],
        ],
        'claim-resource': [
          "INSERT INTO slot_claims (tenant_id, resource_id, booking_id, start_at, end_at) VALUES ($1, $2, $3, '2030-01-01T10:00Z', '2030-01-01T11:00Z')",
          [first.tenant, second.resource, ownBooking],
        ],
        'claim-booking': [
          "INSERT INTO slot_claims (tenant_id, resource_id, booking_id, start_at, end_at) VALUES ($1, $2, $3, '2030-01-01T10:00Z', '2030-01-01T11:00Z')",
          [first.tenant, first.resource, otherBooking],
        ],
        cursor: [
          'UPDATE tenants SET resource_rotation_cursor = $1 WHERE id = $2',
          [second.resource, first.tenant],
        ],
        calendar: [
          "INSERT INTO availability_calendars (tenant_id, scope, resource_id) VALUES ($1, 'RESOURCE', $2)",
          [first.tenant, second.resource],
        ],
        policy: [
          "INSERT INTO booking_policies (tenant_id, scope, service_id) VALUES ($1, 'SERVICE', $2)",
          [first.tenant, second.service],
        ],
        'event-actor': [
          "INSERT INTO booking_events (tenant_id, booking_id, event_type, actor_kind, actor_membership_id) VALUES ($1, $2, 'created', 'MEMBER', $3)",
          [first.tenant, ownBooking, second.member],
        ],
      };
      const [text, values] = statements[relation];
      await expect(client.query(text, values)).rejects.toMatchObject({
        code: '23503',
      });
    });
  });

  it('accepts a resource rotation cursor from its own business', async () => {
    await inTransaction(async (client) => {
      const result = await client.query(
        'UPDATE tenants SET resource_rotation_cursor = $1 WHERE id = $2 RETURNING resource_rotation_cursor',
        [first.resource, first.tenant],
      );
      expect(result.rows[0].resource_rotation_cursor).toBe(first.resource);
    });
  });

  it.each(['TENANT', 'RESOURCE'])(
    'enforces one %s calendar per target including null-target tenant scope',
    async (scope) => {
      await inTransaction(async (client) => {
        const resource = scope === 'RESOURCE' ? first.resource : null;
        await client.query(
          'INSERT INTO availability_calendars (tenant_id, scope, resource_id) VALUES ($1, $2, $3)',
          [first.tenant, scope, resource],
        );
        await expect(
          client.query(
            'INSERT INTO availability_calendars (tenant_id, scope, resource_id) VALUES ($1, $2, $3)',
            [first.tenant, scope, resource],
          ),
        ).rejects.toMatchObject({ code: '23505' });
      });
    },
  );

  it.each(['TENANT', 'SERVICE', 'RESOURCE'])(
    'enforces one %s policy per target',
    async (scope) => {
      await inTransaction(async (client) => {
        const values = [
          first.tenant,
          scope,
          scope === 'SERVICE' ? first.service : null,
          scope === 'RESOURCE' ? first.resource : null,
        ];
        const text =
          'INSERT INTO booking_policies (tenant_id, scope, service_id, resource_id) VALUES ($1, $2, $3, $4)';
        await client.query(text, values);
        await expect(client.query(text, values)).rejects.toMatchObject({
          code: '23505',
        });
      });
    },
  );

  it.each([
    [
      "INSERT INTO availability_calendars (tenant_id, scope) VALUES ($1, 'RESOURCE')",
      'calendar without resource',
    ],
    [
      "INSERT INTO booking_policies (tenant_id, scope) VALUES ($1, 'SERVICE')",
      'policy without service',
    ],
    [
      "INSERT INTO booking_policies (tenant_id, scope, booking_lead) VALUES ($1, 'TENANT', -1)",
      'negative lead time',
    ],
    [
      "INSERT INTO booking_policies (tenant_id, scope, deposit_mode, deposit_value) VALUES ($1, 'TENANT', 'PERCENTAGE', 101)",
      'percentage over 100',
    ],
    [
      "INSERT INTO services (tenant_id, name, duration, price) VALUES ($1, 'Invalid', 0, 100)",
      'zero duration',
    ],
    [
      "INSERT INTO services (tenant_id, name, duration, price) VALUES ($1, 'Invalid', 30, -1)",
      'negative price',
    ],
    [
      "INSERT INTO services (tenant_id, name, duration, price) VALUES ($1, 'Invalid', 30, 'NaN')",
      'non-finite price',
    ],
    [
      "INSERT INTO booking_policies (tenant_id, scope, deposit_value) VALUES ($1, 'TENANT', 'NaN')",
      'non-finite deposit policy',
    ],
    [
      "INSERT INTO customers (tenant_id, phone) VALUES ($1, 'not-a-phone')",
      'unnormalized phone',
    ],
  ])('rejects invalid values: %s (%s)', async (text) => {
    await inTransaction(async (client) => {
      await expect(client.query(text, [first.tenant])).rejects.toMatchObject({
        code: '23514',
      });
    });
  });

  it('rejects policy targets that contradict their declared scope', async () => {
    await inTransaction(async (client) => {
      await expect(
        client.query(
          "INSERT INTO booking_policies (tenant_id, scope, service_id, resource_id) VALUES ($1, 'SERVICE', $2, $3)",
          [first.tenant, first.service, first.resource],
        ),
      ).rejects.toMatchObject({ code: '23514' });
    });
  });

  it.each(['agreed_price', 'required_deposit'])(
    'rejects a non-finite booking %s',
    async (column) => {
      await inTransaction(async (client) => {
        const id = await booking(client);
        await expect(
          client.query(`UPDATE bookings SET ${column} = 'NaN' WHERE id = $1`, [
            id,
          ]),
        ).rejects.toMatchObject({ code: '23514' });
      });
    },
  );

  it('does not allow service policy overrides for tenant-only fields', async () => {
    await inTransaction(async (client) => {
      await expect(
        client.query(
          "INSERT INTO booking_policies (tenant_id, scope, service_id, future_booking_limit) VALUES ($1, 'SERVICE', $2, 2)",
          [first.tenant, first.service],
        ),
      ).rejects.toMatchObject({ code: '23514' });
    });
  });

  it('distinguishes inherited deposit policy from explicitly disabled deposits', async () => {
    await inTransaction(async (client) => {
      const result = await client.query(
        "INSERT INTO booking_policies (tenant_id, scope, service_id, deposit_mode) VALUES ($1, 'TENANT', null, 'DISABLED'), ($1, 'SERVICE', $2, null) RETURNING scope, deposit_mode",
        [first.tenant, first.service],
      );
      expect(result.rows).toEqual([
        { scope: 'TENANT', deposit_mode: 'DISABLED' },
        { scope: 'SERVICE', deposit_mode: null },
      ]);
    });
  });

  it('rejects recurring hours with an invalid weekday', async () => {
    await inTransaction(async (client) => {
      const calendar = await client.query(
        "INSERT INTO availability_calendars (tenant_id, scope) VALUES ($1, 'TENANT') RETURNING id",
        [first.tenant],
      );
      await expect(
        client.query(
          "INSERT INTO availability_rules (tenant_id, calendar_id, weekday, start_time, end_time) VALUES ($1, $2, 7, '09:00', '18:00')",
          [first.tenant, calendar.rows[0].id],
        ),
      ).rejects.toMatchObject({ code: '23514' });
    });
  });

  it('rejects zero-length and reversed claim intervals', async () => {
    await inTransaction(async (client) => {
      const id = await booking(client);
      await expect(
        claim(client, id, '2030-01-01T11:00Z', '2030-01-01T10:00Z'),
      ).rejects.toMatchObject({ code: '23514' });
    });
  });

  it('rejects overlapping active claims even for different bookings', async () => {
    await inTransaction(async (client) => {
      await claim(client, await booking(client));
      await expect(
        claim(
          client,
          await booking(client),
          '2030-01-01T10:30Z',
          '2030-01-01T11:30Z',
        ),
      ).rejects.toMatchObject({ code: '23P01' });
    });
  });

  it('accepts adjacent half-open claim intervals', async () => {
    await inTransaction(async (client) => {
      await claim(client, await booking(client));
      await claim(
        client,
        await booking(client),
        '2030-01-01T11:00Z',
        '2030-01-01T12:00Z',
      );
      const result = await client.query(
        'SELECT count(*)::int AS count FROM slot_claims WHERE tenant_id = $1',
        [first.tenant],
      );
      expect(result.rows[0].count).toBe(2);
    });
  });

  it('permits independent bookings in distinct businesses at the same time', async () => {
    await inTransaction(async (client) => {
      await claim(client, await booking(client));
      await claim(
        client,
        await booking(client, second),
        undefined,
        undefined,
        second,
      );
    });
  });

  it('allows only one active ordinary claim per booking even at disjoint times', async () => {
    await inTransaction(async (client) => {
      const id = await booking(client);
      await claim(client, id);
      await expect(
        claim(client, id, '2030-01-01T12:00Z', '2030-01-01T13:00Z'),
      ).rejects.toMatchObject({ code: '23505' });
    });
  });

  it('retains closed occupancy while atomically inserting a walk-in and private remainders', async () => {
    await inTransaction(async (client) => {
      const originalBooking = await booking(client, first, 'COMPLETED');
      const original = await claim(
        client,
        originalBooking,
        '2030-01-01T10:00Z',
        '2030-01-01T12:00Z',
      );
      await client.query(
        "UPDATE slot_claims SET status = 'CLOSED', closed_at = now(), close_reason = 'explicit CRM reuse' WHERE id = $1",
        [original],
      );
      await claim(
        client,
        originalBooking,
        '2030-01-01T10:00Z',
        '2030-01-01T10:30Z',
        first,
        'PRIVATE_REMAINDER',
      );
      await claim(
        client,
        await booking(client),
        '2030-01-01T10:30Z',
        '2030-01-01T11:00Z',
      );
      await claim(
        client,
        originalBooking,
        '2030-01-01T11:00Z',
        '2030-01-01T12:00Z',
        first,
        'PRIVATE_REMAINDER',
      );
      const result = await client.query(
        'SELECT status, kind, start_at, end_at FROM slot_claims WHERE id = $1',
        [original],
      );
      expect(result.rows[0]).toMatchObject({
        status: 'CLOSED',
        kind: 'BOOKING',
        start_at: new Date('2030-01-01T10:00Z'),
        end_at: new Date('2030-01-01T12:00Z'),
      });
      const count = await client.query(
        "SELECT count(*)::int AS count FROM slot_claims WHERE status = 'ACTIVE'",
      );
      expect(count.rows[0].count).toBe(3);
      await expect(
        claim(
          client,
          await booking(client),
          '2030-01-01T11:30Z',
          '2030-01-01T12:00Z',
        ),
      ).rejects.toMatchObject({ code: '23P01' });
    });
  });

  it.each(['interval', 'owner', 'delete', 'reopen'])(
    'preserves claim history against %s changes',
    async (change) => {
      await inTransaction(async (client) => {
        const id = await claim(client, await booking(client));
        const anotherBooking = await booking(client);
        if (change === 'reopen')
          await client.query(
            "UPDATE slot_claims SET status = 'CLOSED', closed_at = now() WHERE id = $1",
            [id],
          );
        const statements: Record<string, [string, string[]]> = {
          interval: [
            "UPDATE slot_claims SET end_at = '2030-01-01T12:00Z' WHERE id = $1",
            [id],
          ],
          owner: [
            'UPDATE slot_claims SET booking_id = $1 WHERE id = $2',
            [anotherBooking, id],
          ],
          delete: ['DELETE FROM slot_claims WHERE id = $1', [id]],
          reopen: [
            "UPDATE slot_claims SET status = 'ACTIVE', closed_at = null WHERE id = $1",
            [id],
          ],
        };
        const [text, values] = statements[change];
        await expect(client.query(text, values)).rejects.toMatchObject({
          code: '23514',
        });
      });
    },
  );

  it.each(['UPDATE', 'DELETE'])(
    'keeps booking events append-only against %s',
    async (operation) => {
      await inTransaction(async (client) => {
        const id = await booking(client);
        const event = await client.query(
          "INSERT INTO booking_events (tenant_id, booking_id, event_type, actor_kind) VALUES ($1, $2, 'created', 'SYSTEM') RETURNING id",
          [first.tenant, id],
        );
        const text =
          operation === 'UPDATE'
            ? "UPDATE booking_events SET event_type = 'changed' WHERE id = $1"
            : 'DELETE FROM booking_events WHERE id = $1';
        await expect(
          client.query(text, [event.rows[0].id]),
        ).rejects.toMatchObject({ code: '23514' });
      });
    },
  );

  it('gives exactly one winner to two concurrent conflicting claims', async () => {
    const a = await booking(pool);
    const b = await booking(pool);
    const results = await Promise.allSettled([
      claim(pool, a, '2031-01-01T10:00Z', '2031-01-01T11:00Z'),
      claim(pool, b, '2031-01-01T10:00Z', '2031-01-01T11:00Z'),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const failure = results.find((result) => result.status === 'rejected');
    expect(failure?.reason).toMatchObject({ code: '23P01' });
  });

  it('restores the original occupancy when a replacement transaction conflicts', async () => {
    const originalBooking = await booking(pool, first, 'COMPLETED');
    const original = await claim(
      pool,
      originalBooking,
      '2032-01-01T10:00Z',
      '2032-01-01T12:00Z',
    );
    await claim(
      pool,
      await booking(pool),
      '2032-01-01T12:00Z',
      '2032-01-01T13:00Z',
    );
    await inTransaction(async (client) => {
      await client.query(
        "UPDATE slot_claims SET status = 'CLOSED', closed_at = now() WHERE id = $1",
        [original],
      );
      await expect(
        claim(
          client,
          await booking(client),
          '2032-01-01T11:30Z',
          '2032-01-01T12:30Z',
        ),
      ).rejects.toMatchObject({ code: '23P01' });
    });
    const result = await pool.query(
      'SELECT status, start_at, end_at, closed_at FROM slot_claims WHERE id = $1',
      [original],
    );
    expect(result.rows[0]).toEqual({
      status: 'ACTIVE',
      start_at: new Date('2032-01-01T10:00Z'),
      end_at: new Date('2032-01-01T12:00Z'),
      closed_at: null,
    });
  });
});
