import {
  Controller,
  Get,
  Header,
  HttpException,
  Logger,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { problemSchema } from '@agendoxa/shared';
import { vi } from 'vitest';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureHttp } from '../src/platform/http/configure-http.js';

// Test-only routes that raise the errors a real handler or guard could.
@Controller('probe')
class ProbeController {
  @Get('limited')
  @Header('Retry-After', '30')
  limited(): never {
    throw new HttpException('rate limiter state: bucket=abc', 429);
  }

  @Get('limited-without-header')
  limitedWithoutHeader(): never {
    throw new HttpException('rate limiter state: bucket=abc', 429);
  }

  @Get('boom')
  boom(): never {
    throw new Error('connection to db.internal:5432 failed, password=hunter2');
  }
}

describe('Problem details over HTTP', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const moduleFixture = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureHttp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('answers 429 as rate_limited and keeps the Retry-After header', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/probe/limited')
      .expect(429)
      .expect('Content-Type', /application\/problem\+json/)
      .expect('Cache-Control', 'no-store')
      .expect('Retry-After', '30');

    const problem = problemSchema.parse(response.body);
    expect(problem).toMatchObject({ status: 429, code: 'rate_limited' });
    expect(problem.reason).toBeUndefined();
    expect(response.text).not.toContain('bucket=abc');
  });

  it('does not invent Retry-After when none was set', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/probe/limited-without-header')
      .expect(429);

    expect(response.headers).not.toHaveProperty('retry-after');
    expect(problemSchema.parse(response.body).code).toBe('rate_limited');
  });

  it('hides the details of an unexpected error', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/probe/boom')
      .expect(500)
      .expect('Content-Type', /application\/problem\+json/)
      .expect('Cache-Control', 'no-store');

    expect(problemSchema.parse(response.body)).toMatchObject({
      status: 500,
      code: 'internal',
    });
    expect(response.text).not.toContain('hunter2');
    expect(response.text).not.toContain('db.internal');
  });
});
