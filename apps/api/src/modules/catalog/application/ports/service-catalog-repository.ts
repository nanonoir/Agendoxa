// Outbound persistence port of `catalog`. Plain TypeScript: the application
// layer depends on this contract, never on Drizzle or Nest.

/** A service as the application reads it; not a database row. */
export interface ActiveService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  /** Exact decimal with two places, kept as a string to avoid float rounding. */
  price: string;
}

export interface ServiceCatalogRepository {
  /** Active services of one tenant, ordered by name. Never another tenant's. */
  listActiveServices(tenantId: string): Promise<ActiveService[]>;
}

export const SERVICE_CATALOG_REPOSITORY = Symbol('SERVICE_CATALOG_REPOSITORY');
