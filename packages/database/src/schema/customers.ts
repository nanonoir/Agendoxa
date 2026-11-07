import { sql } from 'drizzle-orm';
import {
  check,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenants } from './identity.js';

export const contactPreference = pgEnum('contact_preference', [
  'UNSET',
  'ACCEPTED',
  'REFUSED',
]);
export const deletionStatus = pgEnum('deletion_status', [
  'NONE',
  'REQUESTED',
  'EXECUTED',
]);

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    fullName: text('full_name'),
    phone: text('phone'),
    reminderPreference: contactPreference('reminder_preference')
      .notNull()
      .default('UNSET'),
    waitlistPreference: contactPreference('waitlist_preference')
      .notNull()
      .default('UNSET'),
    deletionStatus: deletionStatus('deletion_status').notNull().default('NONE'),
    deletionRequestedAt: timestamp('deletion_requested_at', {
      withTimezone: true,
    }),
    deletionDueAt: timestamp('deletion_due_at', { withTimezone: true }),
    anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('customers_tenant_id_id_key').on(t.tenantId, t.id),
    uniqueIndex('customers_tenant_phone_key')
      .on(t.tenantId, t.phone)
      .where(sql`${t.phone} IS NOT NULL`),
    check(
      'customers_phone_e164',
      sql`${t.phone} IS NULL OR ${t.phone} ~ '^[+][1-9][0-9]{1,14}$'`,
    ),
    check(
      'customers_deletion_dates_required',
      sql`${t.deletionStatus} = 'NONE' OR (${t.deletionRequestedAt} IS NOT NULL AND ${t.deletionDueAt} IS NOT NULL AND ${t.deletionDueAt} >= ${t.deletionRequestedAt})`,
    ),
    check(
      'customers_anonymization_recorded',
      sql`${t.deletionStatus} <> 'EXECUTED' OR (${t.anonymizedAt} IS NOT NULL AND ${t.phone} IS NULL)`,
    ),
  ],
);
