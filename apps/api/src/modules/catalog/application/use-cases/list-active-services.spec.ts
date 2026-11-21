import { describe, expect, it } from 'vitest';
import type {
  ActiveService,
  ServiceCatalogRepository,
} from '../ports/service-catalog-repository.js';
import {
  ListActiveServices,
  MissingTenantContextError,
} from './list-active-services.js';

// No Nest, HTTP or Drizzle: the port is replaced by an in-memory fake.
class InMemoryServiceCatalog implements ServiceCatalogRepository {
  readonly requestedTenants: string[] = [];

  constructor(private readonly byTenant: Record<string, ActiveService[]>) {}

  listActiveServices(tenantId: string): Promise<ActiveService[]> {
    this.requestedTenants.push(tenantId);
    return Promise.resolve(this.byTenant[tenantId] ?? []);
  }
}

const haircut: ActiveService = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Corte',
  description: null,
  durationMinutes: 30,
  price: '7500.00',
};
const court: ActiveService = {
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Cancha',
  description: 'Alquiler de 60 minutos',
  durationMinutes: 60,
  price: '30000.00',
};

describe('ListActiveServices', () => {
  it('returns the services of the resolved tenant only', async () => {
    const catalog = new InMemoryServiceCatalog({
      'tenant-a': [haircut],
      'tenant-b': [court],
    });
    const useCase = new ListActiveServices(catalog);

    await expect(useCase.execute({ tenantId: 'tenant-a' })).resolves.toEqual([
      haircut,
    ]);
    expect(catalog.requestedTenants).toEqual(['tenant-a']);
  });

  it('returns an empty list when the tenant offers no active service', async () => {
    const useCase = new ListActiveServices(new InMemoryServiceCatalog({}));

    await expect(useCase.execute({ tenantId: 'tenant-c' })).resolves.toEqual(
      [],
    );
  });

  it.each(['', '   '])(
    'rejects a missing tenant context (%j) without reading persistence',
    async (tenantId) => {
      const catalog = new InMemoryServiceCatalog({});
      const useCase = new ListActiveServices(catalog);

      await expect(useCase.execute({ tenantId })).rejects.toBeInstanceOf(
        MissingTenantContextError,
      );
      expect(catalog.requestedTenants).toEqual([]);
    },
  );
});
