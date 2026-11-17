import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
  type ArgumentsHost,
} from '@nestjs/common';
import { vi } from 'vitest';
import { problemSchema, type Problem } from '@agendoxa/shared';
import { ProblemDetailsFilter } from './problem-details.filter.js';
import { RequestValidationException } from './request-validation.js';

interface Captured {
  status?: number;
  headers: Record<string, string | number | string[]>;
  type?: string;
  body?: string;
}

function run(
  exception: unknown,
  preset: Record<string, string> = {},
): { captured: Captured; problem: Problem } {
  const captured: Captured = { headers: { ...preset } };
  const response = {
    status(value: number) {
      captured.status = value;
      return response;
    },
    getHeader: (name: string) => captured.headers[name],
    setHeader(name: string, value: string | number | string[]) {
      captured.headers[name] = value;
      return response;
    },
    type(value: string) {
      captured.type = value;
      return response;
    },
    send(body: string) {
      captured.body = body;
      return response;
    },
  };
  const request = {
    method: 'GET',
    path: '/x',
    header: () => 'req_test_01',
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  new ProblemDetailsFilter().catch(exception, host);

  const problem = problemSchema.parse(JSON.parse(captured.body ?? 'null'));
  return { captured, problem };
}

describe('ProblemDetailsFilter', () => {
  beforeEach(() => {
    // Unexpected errors are logged on purpose; keep the test output clean.
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [new BadRequestException(), 400, 'validation'],
    [new UnauthorizedException(), 401, 'unauthorized'],
    [new ForbiddenException(), 403, 'forbidden'],
    [new NotFoundException(), 404, 'not_found'],
    [new ConflictException(), 409, 'conflict'],
    [new UnprocessableEntityException(), 422, 'rule_violation'],
    [new ServiceUnavailableException(), 503, 'external_dependency'],
  ])('keeps the contract status for %o', (exception, status, code) => {
    const { captured, problem } = run(exception);

    expect(captured.status).toBe(status);
    expect(captured.type).toBe('application/problem+json');
    expect(captured.headers['Cache-Control']).toBe('no-store');
    expect(captured.headers['X-Request-Id']).toBe('req_test_01');
    expect(problem).toMatchObject({
      status,
      code,
      requestId: 'req_test_01',
    });
    expect(problem.reason).toBeUndefined();
  });

  it('carries the issues of a request validation failure', () => {
    const { problem } = run(
      new RequestValidationException([{ path: '/slug', message: 'Invalid' }]),
    );

    expect(problem.errors).toEqual([{ path: '/slug', message: 'Invalid' }]);
  });

  it('maps 413 to validation/file_too_large and keeps the status', () => {
    const { captured, problem } = run(new HttpException('big', 413));

    expect(captured.status).toBe(413);
    expect(problem).toMatchObject({
      status: 413,
      code: 'validation',
      reason: 'file_too_large',
    });
  });

  it('maps 415 to validation/unsupported_media_type and keeps the status', () => {
    const { captured, problem } = run(new HttpException('media', 415));

    expect(captured.status).toBe(415);
    expect(problem).toMatchObject({
      status: 415,
      code: 'validation',
      reason: 'unsupported_media_type',
    });
  });

  it('maps 429 to conflict/rate_limited and propagates Retry-After', () => {
    const { captured, problem } = run(new HttpException('slow down', 429), {
      'Retry-After': '30',
    });

    expect(captured.status).toBe(429);
    expect(captured.headers['Retry-After']).toBe('30');
    expect(problem).toMatchObject({
      status: 429,
      code: 'conflict',
      reason: 'rate_limited',
    });
  });

  it('does not invent Retry-After for a 429 without it', () => {
    const { captured } = run(new HttpException('slow down', 429));

    expect(captured.status).toBe(429);
    expect(captured.headers).not.toHaveProperty('Retry-After');
  });

  it.each([405, 406, 418])(
    'keeps the status of the unlisted client error %i as validation without a reason',
    (status) => {
      const { captured, problem } = run(new HttpException('nope', status));

      expect(captured.status).toBe(status);
      expect(problem).toMatchObject({ status, code: 'validation' });
      expect(problem.reason).toBeUndefined();
    },
  );

  it('never copies an exception message into the problem', () => {
    const { captured } = run(
      new HttpException('select * from secrets; token=abc', 418),
    );

    expect(captured.body).not.toContain('secrets');
    expect(captured.body).not.toContain('token=abc');
  });

  it('answers an unexpected error with a generic internal problem', () => {
    const { captured, problem } = run(
      new Error('connection to db.internal:5432 failed, password=hunter2'),
    );

    expect(captured.status).toBe(500);
    expect(captured.headers['Cache-Control']).toBe('no-store');
    expect(problem).toMatchObject({ status: 500, code: 'internal' });
    expect(problem.detail).toBeUndefined();
    expect(captured.body).not.toContain('hunter2');
    expect(captured.body).not.toContain('db.internal');
  });

  it('reports an unlisted 5xx as a generic 500', () => {
    const { captured, problem } = run(new HttpException('gateway', 502));

    expect(captured.status).toBe(500);
    expect(problem).toMatchObject({ status: 500, code: 'internal' });
    expect(captured.body).not.toContain('gateway');
  });
});
