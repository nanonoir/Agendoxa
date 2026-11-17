import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { problemSchema, publicServiceListSchema } from '@agendoxa/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DATABASE_CONNECTION } from '../src/database/database.module.js';
import {
  SERVICE_CATALOG_REPOSITORY,
  type ServiceCatalogRepository,
} from '../src/modules/catalog/application/ports/service-catalog-repository.js';
import {
  PUBLIC_TENANT_LOOKUP,
  type PublicTenantLookup,
} from '../src/modules/tenants/contracts/public-tenant-lookup.js';
import { configureHttp } from '../src/platform/http/configure-http.js';

const tenantId = '00000000-0000-4000-8000-000000000100';
const tenants: PublicTenantLookup = {
  findBySlug: (slug) =>
    Promise.resolve(slug === 'demo-barber' ? { tenantId } : null),
};
const services: ServiceCatalogRepository = {
  listActiveServices: (id) =>
    Promise.resolve(
      id === tenantId
        ? [
            {
              id: '00000000-0000-4000-8000-000000000103',
              name: 'Corte',
              description: null,
              durationMinutes: 30,
              price: '7500.00',
            },
          ]
        : [],
    ),
};

describe('GET /api/v1/public/businesses/:slug/services (HTTP contract)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DATABASE_CONNECTION)
      .useValue({})
      .overrideProvider(PUBLIC_TENANT_LOOKUP)
      .useValue(tenants)
      .overrideProvider(SERVICE_CATALOG_REPOSITORY)
      .useValue(services)
      .compile();
    app = moduleFixture.createNestApplication();
    configureHttp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the active services with the public cache policy', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public/businesses/demo-barber/services')
      .expect(200)
      .expect('Content-Type', /application\/json/)
      .expect('Cache-Control', 'public, max-age=300');

    expect(publicServiceListSchema.parse(response.body)).toEqual(response.body);
    expect(response.body).toEqual({
      items: [
        {
          id: '00000000-0000-4000-8000-000000000103',
          name: 'Corte',
          description: null,
          durationMinutes: 30,
          price: '7500.00',
        },
      ],
    });
  });

  it('answers an unknown slug with a not_found problem', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public/businesses/unknown-business/services')
      .set('X-Request-Id', 'req_test_01')
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/)
      .expect('X-Request-Id', 'req_test_01')
      .expect('Cache-Control', 'no-store');

    expect(problemSchema.parse(response.body)).toEqual({
      type: 'urn:agendoxa:problem:not-found',
      title: 'Not found',
      status: 404,
      code: 'not_found',
      requestId: 'req_test_01',
    });
  });

  it('answers a slug outside the contract with a validation problem', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public/businesses/Not_A_Slug/services')
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);

    const problem = problemSchema.parse(response.body);
    expect(problem).toMatchObject({ status: 400, code: 'validation' });
    expect(problem.errors?.map((error) => error.path)).toEqual(['/slug']);
    expect(response.headers['x-request-id']).toBe(problem.requestId);
  });

  it('keeps the status of a framework error as a problem', async () => {
    // The JSON body parser rejects the oversized body before any route runs.
    const response = await request(app.getHttpServer())
      .post('/api/v1/public/businesses/demo-barber/services')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ filler: 'x'.repeat(200_000) }))
      .expect(413)
      .expect('Content-Type', /application\/problem\+json/)
      .expect('Cache-Control', 'no-store');

    const problem = problemSchema.parse(response.body);
    expect(problem).toMatchObject({
      status: 413,
      code: 'validation',
      reason: 'file_too_large',
    });
    expect(response.headers['x-request-id']).toBe(problem.requestId);
  });

  it('keeps GET /health outside the versioned prefix', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
    await request(app.getHttpServer()).get('/api/v1/health').expect(404);
  });
});
