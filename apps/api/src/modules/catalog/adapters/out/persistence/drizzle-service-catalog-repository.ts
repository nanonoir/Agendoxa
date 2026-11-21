import type { DatabaseConnection } from '@agendoxa/database';
import type {
  ActiveService,
  ServiceCatalogRepository,
} from '../../../application/ports/service-catalog-repository.js';

/**
 * Reads `services`, a table `catalog` owns (MOD-DM-02). Every query is scoped
 * by `tenant_id`; constraints do not filter reads and RLS is not active.
 */
export class DrizzleServiceCatalogRepository implements ServiceCatalogRepository {
  constructor(private readonly db: DatabaseConnection['db']) {}

  async listActiveServices(tenantId: string): Promise<ActiveService[]> {
    const rows = await this.db.query.services.findMany({
      columns: {
        id: true,
        name: true,
        description: true,
        duration: true,
        price: true,
      },
      where: (services, { and, eq }) =>
        and(eq(services.tenantId, tenantId), eq(services.isActive, true)),
      orderBy: (services, { asc }) => [asc(services.name), asc(services.id)],
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      durationMinutes: row.duration,
      price: row.price,
    }));
  }
}
