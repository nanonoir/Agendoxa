import type {
  ActiveService,
  ServiceCatalogRepository,
} from '../ports/service-catalog-repository.js';

export interface ListActiveServicesQuery {
  /** Already resolved by the entry point (TEN-DM-07); never chosen by a client. */
  tenantId: string;
}

/** Thrown when a caller forgets the tenant context: a defect, not a client error. */
export class MissingTenantContextError extends Error {
  constructor() {
    super('A resolved tenant context is required');
    this.name = 'MissingTenantContextError';
  }
}

/**
 * Lists the services a business currently offers. Entry points resolve the
 * tenant first: the public landing from its slug today, the CRM from the
 * active membership and agent tools from the conversation later.
 */
export class ListActiveServices {
  constructor(private readonly services: ServiceCatalogRepository) {}

  async execute(query: ListActiveServicesQuery): Promise<ActiveService[]> {
    if (!query.tenantId.trim()) throw new MissingTenantContextError();
    return this.services.listActiveServices(query.tenantId);
  }
}
