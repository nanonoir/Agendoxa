import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { resources, services } from './catalog.js';
import { tenantMemberships, tenants } from './identity.js';

export const calendarScope = pgEnum('calendar_scope', ['TENANT', 'RESOURCE']);
export const policyScope = pgEnum('policy_scope', [
  'TENANT',
  'SERVICE',
  'RESOURCE',
]);
export const availabilityExceptionKind = pgEnum('availability_exception_kind', [
  'BLOCK',
  'OPENING',
]);
export const depositMode = pgEnum('deposit_mode', [
  'DISABLED',
  'FIXED',
  'PERCENTAGE',
]);
export const depositRefundPolicy = pgEnum('deposit_refund_policy', [
  'NO_MONEY_BACK',
  'REFUND_POSSIBLE',
]);

export const availabilityCalendars = pgTable(
  'availability_calendars',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    scope: calendarScope('scope').notNull(),
    resourceId: uuid('resource_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('availability_calendars_tenant_id_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'availability_calendars_resource_same_tenant_fk',
      columns: [t.tenantId, t.resourceId],
      foreignColumns: [resources.tenantId, resources.id],
    }).onDelete('restrict'),
    check(
      'availability_calendars_scope_target',
      sql`(${t.scope} = 'TENANT' AND ${t.resourceId} IS NULL) OR (${t.scope} = 'RESOURCE' AND ${t.resourceId} IS NOT NULL)`,
    ),
    uniqueIndex('availability_calendars_tenant_scope_key')
      .on(t.tenantId)
      .where(sql`${t.scope} = 'TENANT'`),
    uniqueIndex('availability_calendars_resource_scope_key')
      .on(t.tenantId, t.resourceId)
      .where(sql`${t.scope} = 'RESOURCE'`),
  ],
);

export const availabilityRules = pgTable(
  'availability_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    calendarId: uuid('calendar_id').notNull(),
    weekday: integer('weekday').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('availability_rules_tenant_id_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'availability_rules_calendar_same_tenant_fk',
      columns: [t.tenantId, t.calendarId],
      foreignColumns: [
        availabilityCalendars.tenantId,
        availabilityCalendars.id,
      ],
    }).onDelete('restrict'),
    check(
      'availability_rules_weekday_range',
      sql`${t.weekday} BETWEEN 0 AND 6`,
    ),
    check('availability_rules_time_order', sql`${t.startTime} < ${t.endTime}`),
  ],
);

export const availabilityExceptions = pgTable(
  'availability_exceptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    calendarId: uuid('calendar_id').notNull(),
    kind: availabilityExceptionKind('kind').notNull(),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    reason: text('reason'),
    createdByMembershipId: uuid('created_by_membership_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('availability_exceptions_tenant_id_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'availability_exceptions_calendar_same_tenant_fk',
      columns: [t.tenantId, t.calendarId],
      foreignColumns: [
        availabilityCalendars.tenantId,
        availabilityCalendars.id,
      ],
    }).onDelete('restrict'),
    foreignKey({
      name: 'availability_exceptions_author_same_tenant_fk',
      columns: [t.tenantId, t.createdByMembershipId],
      foreignColumns: [tenantMemberships.tenantId, tenantMemberships.id],
    }).onDelete('restrict'),
    check(
      'availability_exceptions_interval',
      sql`isfinite(${t.startAt}) AND isfinite(${t.endAt}) AND ${t.startAt} < ${t.endAt}`,
    ),
  ],
);

export const bookingPolicies = pgTable(
  'booking_policies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    scope: policyScope('scope').notNull(),
    serviceId: uuid('service_id'),
    resourceId: uuid('resource_id'),
    notice: integer('notice'),
    bookingLead: integer('booking_lead'),
    reminderLead: integer('reminder_lead'),
    depositMode: depositMode('deposit_mode'),
    depositValue: numeric('deposit_value', { precision: 12, scale: 2 }),
    depositRefundPolicy: depositRefundPolicy('deposit_refund_policy'),
    rescheduleLimit: integer('reschedule_limit'),
    futureBookingLimit: integer('future_booking_limit'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('booking_policies_tenant_id_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'booking_policies_service_same_tenant_fk',
      columns: [t.tenantId, t.serviceId],
      foreignColumns: [services.tenantId, services.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'booking_policies_resource_same_tenant_fk',
      columns: [t.tenantId, t.resourceId],
      foreignColumns: [resources.tenantId, resources.id],
    }).onDelete('restrict'),
    check(
      'booking_policies_scope_target',
      sql`(${t.scope} = 'TENANT' AND ${t.serviceId} IS NULL AND ${t.resourceId} IS NULL) OR (${t.scope} = 'SERVICE' AND ${t.serviceId} IS NOT NULL AND ${t.resourceId} IS NULL) OR (${t.scope} = 'RESOURCE' AND ${t.resourceId} IS NOT NULL AND ${t.serviceId} IS NULL)`,
    ),
    check(
      'booking_policies_tenant_only_fields',
      sql`${t.scope} = 'TENANT' OR (${t.bookingLead} IS NULL AND ${t.futureBookingLimit} IS NULL)`,
    ),
    check(
      'booking_policies_nonnegative_values',
      sql`(${t.notice} IS NULL OR ${t.notice} >= 0) AND (${t.bookingLead} IS NULL OR ${t.bookingLead} >= 0) AND (${t.reminderLead} IS NULL OR ${t.reminderLead} >= 0) AND (${t.rescheduleLimit} IS NULL OR ${t.rescheduleLimit} >= 0) AND (${t.futureBookingLimit} IS NULL OR ${t.futureBookingLimit} > 0) AND (${t.depositValue} IS NULL OR ${t.depositValue} >= 0)`,
    ),
    check(
      'booking_policies_percentage_range',
      sql`${t.depositMode} IS DISTINCT FROM 'PERCENTAGE' OR ${t.depositValue} IS NULL OR ${t.depositValue} <= 100`,
    ),
    check(
      'booking_policies_deposit_finite',
      sql`${t.depositValue} IS NULL OR ${t.depositValue} <> 'NaN'::numeric`,
    ),
    uniqueIndex('booking_policies_tenant_scope_key')
      .on(t.tenantId)
      .where(sql`${t.scope} = 'TENANT'`),
    uniqueIndex('booking_policies_service_scope_key')
      .on(t.tenantId, t.serviceId)
      .where(sql`${t.scope} = 'SERVICE'`),
    uniqueIndex('booking_policies_resource_scope_key')
      .on(t.tenantId, t.resourceId)
      .where(sql`${t.scope} = 'RESOURCE'`),
  ],
);
