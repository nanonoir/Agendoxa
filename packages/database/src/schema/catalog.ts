import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  foreignKey,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenants } from './identity.js';

export const resourceKind = pgEnum('resource_kind', [
  'PROFESSIONAL',
  'PHYSICAL',
]);

export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references((): AnyPgColumn => tenants.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    duration: integer('duration').notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('services_tenant_id_id_key').on(t.tenantId, t.id),
    check('services_duration_positive', sql`${t.duration} > 0`),
    check('services_price_nonnegative', sql`${t.price} >= 0`),
    check('services_price_finite', sql`${t.price} <> 'NaN'::numeric`),
  ],
);

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references((): AnyPgColumn => tenants.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    kind: resourceKind('kind').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    preferenceOrder: integer('preference_order'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('resources_tenant_id_id_key').on(t.tenantId, t.id),
    check(
      'resources_preference_nonnegative',
      sql`${t.preferenceOrder} IS NULL OR ${t.preferenceOrder} >= 0`,
    ),
  ],
);

export const serviceResources = pgTable(
  'service_resources',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references((): AnyPgColumn => tenants.id, { onDelete: 'restrict' }),
    serviceId: uuid('service_id').notNull(),
    resourceId: uuid('resource_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.serviceId, t.resourceId] }),
    foreignKey({
      name: 'service_resources_service_same_tenant_fk',
      columns: [t.tenantId, t.serviceId],
      foreignColumns: [services.tenantId, services.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'service_resources_resource_same_tenant_fk',
      columns: [t.tenantId, t.resourceId],
      foreignColumns: [resources.tenantId, resources.id],
    }).onDelete('restrict'),
  ],
);
