// Public contract of `tenants` (MOD-DM-10): plain types and a DI token, with
// no Nest or Drizzle imports, so other modules' application code can use it.

/** The tenant a public slug selects for display. It authorizes nothing. */
export interface PublicTenant {
  tenantId: string;
}

/**
 * Resolves the business a public landing route names (TEN-DM-07, "Public
 * routing"). Returns null when no tenant has that slug.
 */
export interface PublicTenantLookup {
  findBySlug(slug: string): Promise<PublicTenant | null>;
}

export const PUBLIC_TENANT_LOOKUP = Symbol('PUBLIC_TENANT_LOOKUP');
