import { randomUUID } from 'node:crypto';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Problem, ProblemCode } from '@agendoxa/shared';
import type { Request, Response } from 'express';
import { RequestValidationException } from './request-validation.js';

const categories: Record<number, { code: ProblemCode; title: string }> = {
  400: { code: 'validation', title: 'The request does not match the contract' },
  401: { code: 'unauthorized', title: 'Authentication required' },
  403: { code: 'forbidden', title: 'The operation is not allowed' },
  404: { code: 'not_found', title: 'Not found' },
  409: { code: 'conflict', title: 'The current state prevents the operation' },
  422: { code: 'rule_violation', title: 'A business rule rejects the request' },
  503: {
    code: 'external_dependency',
    title: 'A required external service failed',
  },
};
const internal = { code: 'internal' as const, title: 'Unexpected error' };
const requestIdPattern = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Writes every error as RFC 9457 problem details (API-DM-09). It never exposes
 * stack traces, SQL or another tenant's data: unexpected errors become a
 * generic `internal` problem and are only logged.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const incoming = request.header('x-request-id');
    const requestId =
      incoming && requestIdPattern.test(incoming) ? incoming : randomUUID();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const category = categories[status] ?? internal;
    if (category === internal) {
      this.logger.error(
        `Unhandled error for ${request.method} ${request.path} (${requestId})`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const problem: Problem = {
      type: `urn:agendoxa:problem:${category.code.replaceAll('_', '-')}`,
      title: category.title,
      status: category === internal ? 500 : status,
      code: category.code,
      requestId,
      ...(exception instanceof RequestValidationException
        ? { errors: exception.issues }
        : {}),
    };

    // Overrides any cache header a handler set before failing: errors are
    // never cached by shared caches.
    response
      .status(problem.status)
      .setHeader('Cache-Control', 'no-store')
      .setHeader('X-Request-Id', requestId)
      .type('application/problem+json')
      .send(JSON.stringify(problem));
  }
}
