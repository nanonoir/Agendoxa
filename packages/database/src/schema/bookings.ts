import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { depositRefundPolicy } from './availability.js';
import { resources, services } from './catalog.js';
import { customers } from './customers.js';
import { collectionMode, tenantMemberships, tenants } from './identity.js';

export const bookingStatus = pgEnum('booking_status', [
  'HOLD',
  'PENDING_PAYMENT_REVIEW',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED',
  'COMPLETED',
  'NO_SHOW',
]);
export const bookingOrigin = pgEnum('booking_origin', ['WHATSAPP', 'CRM']);
export const claimKind = pgEnum('claim_kind', ['BOOKING', 'PRIVATE_REMAINDER']);
export const claimStatus = pgEnum('claim_status', ['ACTIVE', 'CLOSED']);
export const bookingActorKind = pgEnum('booking_actor_kind', [
  'CUSTOMER',
  'MEMBER',
  'AI',
  'SYSTEM',
]);
export const lateChangeKind = pgEnum('late_change_kind', [
  'LATE_CANCELLATION',
  'LATE_RESCHEDULE',
]);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').notNull(),
    serviceId: uuid('service_id').notNull(),
    status: bookingStatus('status').notNull(),
    origin: bookingOrigin('origin').notNull(),
    attendeeName: text('attendee_name'),
    attendeePhone: text('attendee_phone'),
    agreedPrice: numeric('agreed_price', { precision: 12, scale: 2 }).notNull(),
    requiredDeposit: numeric('required_deposit', { precision: 12, scale: 2 }),
    noticeSnapshot: integer('notice_snapshot').notNull(),
    depositRefundPolicySnapshot: depositRefundPolicy(
      'deposit_refund_policy_snapshot',
    ),
    collectionModeSnapshot: collectionMode(
      'collection_mode_snapshot',
    ).notNull(),
    holdExpiresAt: timestamp('hold_expires_at', { withTimezone: true }),
    correctionDeadlineAt: timestamp('correction_deadline_at', {
      withTimezone: true,
    }),
    blockedException: boolean('blocked_exception').notNull().default(false),
    depositException: boolean('deposit_exception').notNull().default(false),
    createdByMembershipId: uuid('created_by_membership_id'),
    cancelReason: text('cancel_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('bookings_tenant_id_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'bookings_customer_same_tenant_fk',
      columns: [t.tenantId, t.customerId],
      foreignColumns: [customers.tenantId, customers.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'bookings_service_same_tenant_fk',
      columns: [t.tenantId, t.serviceId],
      foreignColumns: [services.tenantId, services.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'bookings_author_same_tenant_fk',
      columns: [t.tenantId, t.createdByMembershipId],
      foreignColumns: [tenantMemberships.tenantId, tenantMemberships.id],
    }).onDelete('restrict'),
    check(
      'bookings_amounts_nonnegative',
      sql`${t.agreedPrice} >= 0 AND (${t.requiredDeposit} IS NULL OR ${t.requiredDeposit} >= 0)`,
    ),
    check(
      'bookings_amounts_finite',
      sql`${t.agreedPrice} <> 'NaN'::numeric AND (${t.requiredDeposit} IS NULL OR ${t.requiredDeposit} <> 'NaN'::numeric)`,
    ),
    check('bookings_notice_nonnegative', sql`${t.noticeSnapshot} >= 0`),
    check(
      'bookings_hold_has_deadline',
      sql`${t.status} <> 'HOLD' OR ${t.holdExpiresAt} IS NOT NULL`,
    ),
    check(
      'bookings_crm_author',
      sql`${t.origin} <> 'CRM' OR (${t.createdByMembershipId} IS NOT NULL AND ${t.status} <> 'HOLD')`,
    ),
    check(
      'bookings_whatsapp_author',
      sql`${t.origin} <> 'WHATSAPP' OR ${t.createdByMembershipId} IS NULL`,
    ),
    check(
      'bookings_attendee_phone_e164',
      sql`${t.attendeePhone} IS NULL OR ${t.attendeePhone} ~ '^[+][1-9][0-9]{1,14}$'`,
    ),
  ],
);

export const slotClaims = pgTable(
  'slot_claims',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    resourceId: uuid('resource_id').notNull(),
    bookingId: uuid('booking_id').notNull(),
    kind: claimKind('kind').notNull().default('BOOKING'),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    status: claimStatus('status').notNull().default('ACTIVE'),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    closeReason: text('close_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('slot_claims_tenant_id_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'slot_claims_resource_same_tenant_fk',
      columns: [t.tenantId, t.resourceId],
      foreignColumns: [resources.tenantId, resources.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'slot_claims_booking_same_tenant_fk',
      columns: [t.tenantId, t.bookingId],
      foreignColumns: [bookings.tenantId, bookings.id],
    }).onDelete('restrict'),
    check(
      'slot_claims_interval',
      sql`isfinite(${t.startAt}) AND isfinite(${t.endAt}) AND ${t.startAt} < ${t.endAt}`,
    ),
    check(
      'slot_claims_closure_consistent',
      sql`(${t.status} = 'ACTIVE' AND ${t.closedAt} IS NULL AND ${t.closeReason} IS NULL) OR (${t.status} = 'CLOSED' AND ${t.closedAt} IS NOT NULL)`,
    ),
    uniqueIndex('slot_claims_active_booking_key')
      .on(t.tenantId, t.bookingId)
      .where(sql`${t.status} = 'ACTIVE' AND ${t.kind} = 'BOOKING'`),
  ],
);

export const bookingEvents = pgTable(
  'booking_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    bookingId: uuid('booking_id').notNull(),
    eventType: text('event_type').notNull(),
    fromStatus: bookingStatus('from_status'),
    toStatus: bookingStatus('to_status'),
    actorKind: bookingActorKind('actor_kind').notNull(),
    actorMembershipId: uuid('actor_membership_id'),
    reason: text('reason'),
    lateChangeKind: lateChangeKind('late_change_kind'),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('booking_events_tenant_id_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'booking_events_booking_same_tenant_fk',
      columns: [t.tenantId, t.bookingId],
      foreignColumns: [bookings.tenantId, bookings.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'booking_events_actor_same_tenant_fk',
      columns: [t.tenantId, t.actorMembershipId],
      foreignColumns: [tenantMemberships.tenantId, tenantMemberships.id],
    }).onDelete('restrict'),
    check(
      'booking_events_member_actor',
      sql`(${t.actorKind} = 'MEMBER' AND ${t.actorMembershipId} IS NOT NULL) OR (${t.actorKind} <> 'MEMBER' AND ${t.actorMembershipId} IS NULL)`,
    ),
  ],
);
