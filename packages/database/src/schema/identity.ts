import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  type PgTableExtraConfigValue,
  boolean,
  check,
  foreignKey,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { resources } from './catalog.js';

export const collectionMode = pgEnum('collection_mode', [
  'ALL_PROFESSIONAL',
  'DEPOSIT_BUSINESS_REMAINDER_PROFESSIONAL',
  'ALL_BUSINESS',
]);
export const accountSelection = pgEnum('account_selection', [
  'DEFAULT',
  'SEQUENTIAL_ROTATION',
]);
export const resourceAssignment = pgEnum('resource_assignment', [
  'PREFERENCE_ORDER',
  'ROTATION',
]);
export const userStatus = pgEnum('user_status', ['ACTIVE', 'DISABLED']);
export const membershipStatus = pgEnum('membership_status', [
  'ACTIVE',
  'DEACTIVATED',
]);
export const systemRole = pgEnum('system_role', ['ADMIN', 'STAFF']);

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    timezone: text('timezone').notNull(),
    currency: text('currency').notNull(),
    branding: text('branding'),
    collectionMode: collectionMode('collection_mode')
      .notNull()
      .default('ALL_PROFESSIONAL'),
    businessAccountSelection: accountSelection('business_account_selection')
      .notNull()
      .default('DEFAULT'),
    resourceAssignmentMode: resourceAssignment('resource_assignment_mode')
      .notNull()
      .default('PREFERENCE_ORDER'),
    resourceRotationCursor: uuid('resource_rotation_cursor'),
    cashAutoOpen: boolean('cash_auto_open').notNull().default(false),
    aiEnabled: boolean('ai_enabled').notNull().default(false),
    aiDisabledUntil: timestamp('ai_disabled_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    foreignKey({
      name: 'tenants_resource_cursor_same_tenant_fk',
      columns: [t.id, t.resourceRotationCursor],
      foreignColumns: [resources.tenantId, resources.id],
    }).onDelete('restrict'),
    check('tenants_name_not_blank', sql`length(trim(${t.name})) > 0`),
    check('tenants_currency_format', sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  credentialRef: text('credential_ref'),
  status: userStatus('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  description: text('description').notNull(),
  isDelegable: boolean('is_delegable').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references((): AnyPgColumn => tenants.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    systemKey: systemRole('system_key'),
    isProtected: boolean('is_protected').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('roles_tenant_id_id_key').on(t.tenantId, t.id),
    unique('roles_tenant_name_key').on(t.tenantId, t.name),
    uniqueIndex('roles_tenant_system_key')
      .on(t.tenantId, t.systemKey)
      .where(sql`${t.systemKey} IS NOT NULL`),
    check(
      'roles_admin_protected',
      sql`${t.systemKey} IS DISTINCT FROM 'ADMIN' OR ${t.isProtected}`,
    ),
  ],
);

export const tenantMemberships = pgTable(
  'tenant_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references((): AnyPgColumn => tenants.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    roleId: uuid('role_id').notNull(),
    status: membershipStatus('status').notNull().default('ACTIVE'),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('tenant_memberships_tenant_id_id_key').on(t.tenantId, t.id),
    unique('tenant_memberships_tenant_user_key').on(t.tenantId, t.userId),
    foreignKey({
      name: 'tenant_memberships_role_same_tenant_fk',
      columns: [t.tenantId, t.roleId],
      foreignColumns: [roles.tenantId, roles.id],
    }).onDelete('restrict'),
    check(
      'tenant_memberships_deactivation_consistent',
      sql`(${t.status} = 'ACTIVE' AND ${t.deactivatedAt} IS NULL) OR (${t.status} = 'DEACTIVATED' AND ${t.deactivatedAt} IS NOT NULL)`,
    ),
  ],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references((): AnyPgColumn => tenants.id, { onDelete: 'restrict' }),
    roleId: uuid('role_id').notNull(),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionId] }),
    foreignKey({
      name: 'role_permissions_role_same_tenant_fk',
      columns: [t.tenantId, t.roleId],
      foreignColumns: [roles.tenantId, roles.id],
    }).onDelete('restrict'),
  ],
);
