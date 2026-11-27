import { publicServiceListSchema, publicServiceSchema } from '@agendoxa/shared';

const service = {
  id: '0b6f7c1e-3a4d-4e5f-8a9b-1c2d3e4f5a6b',
  name: 'Corte',
  description: null,
  durationMinutes: 30,
  price: '7500.00',
};

describe('publicServiceSchema and publicServiceListSchema (CON-02)', () => {
  it('accepts a valid service', () => {
    expect(publicServiceSchema.parse(service)).toEqual(service);
  });

  it('accepts a valid list, empty or not', () => {
    expect(publicServiceListSchema.parse({ items: [service] })).toEqual({
      items: [service],
    });
    expect(publicServiceListSchema.parse({ items: [] })).toEqual({
      items: [],
    });
  });

  it('rejects an unknown field in a service', () => {
    expect(
      publicServiceSchema.safeParse({ ...service, tenantId: service.id })
        .success,
    ).toBe(false);
    expect(
      publicServiceListSchema.safeParse({
        items: [{ ...service, isActive: true }],
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown field at the list level', () => {
    expect(
      publicServiceListSchema.safeParse({ items: [service], total: 1 }).success,
    ).toBe(false);
  });
});
