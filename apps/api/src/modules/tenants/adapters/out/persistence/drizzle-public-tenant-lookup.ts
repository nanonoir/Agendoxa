import type { DatabaseConnection } from '@agendoxa/database';
import type {
  PublicTenant,
  PublicTenantLookup,
} from '../../../contracts/public-tenant-lookup.js';

/**
 * The only cross-tenant read `tenants` offers here: `Tenant` by `slug`,
 * returning just the ID. Only `tenants` reads the `tenants` table (MOD-DM-02).
 */
export class DrizzlePublicTenantLookup implements PublicTenantLookup {
  constructor(private readonly db: DatabaseConnection['db']) {}

  async findBySlug(slug: string): Promise<PublicTenant | null> {
    const tenant = await this.db.query.tenants.findFirst({
      columns: { id: true },
      where: (tenants, { eq }) => eq(tenants.slug, slug),
    });
    return tenant ? { tenantId: tenant.id } : null;
  }
}
