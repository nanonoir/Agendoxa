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

interface Category {
  code: ProblemCode;
  title: string;
  reason?: string;
}

// Statuses with a CON-02 category of their own (API-DM-09 table).
const categories: Record<number, Category> = {
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

// Framework 4xx statuses with a place in API-DM-09 but outside the usual one
// of their category. The HTTP status is always kept. `file_too_large` is not
// used here: it is reserved for uploaded files the application identifies.
const frameworkCategories: Record<number, Category> = {
  413: {
    code: 'validation',
    title: 'The request body is too large',
    reason: 'payload_too_large',
  },
  415: {
    code: 'validation',
    title: 'The media type is not supported',
    reason: 'unsupported_media_type',
  },
  429: { code: 'rate_limited', title: 'Too many requests' },
};
const otherClientError: Category = {
  code: 'validation',
  title: 'The request cannot be processed',
};
const internal: Category = { code: 'internal', title: 'Unexpected error' };
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

    const httpStatus =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const category =
      categories[httpStatus] ??
      frameworkCategories[httpStatus] ??
      (httpStatus >= 400 && httpStatus < 500 ? otherClientError : internal);
    // Unlisted 5xx and non-HTTP errors are reported as a generic 500.
    const status = category === internal ? 500 : httpStatus;
    if (category === internal) {
      this.logger.error(
        `Unhandled error for ${request.method} ${request.path} (${requestId})`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Titles are fixed per status: an exception message is never copied, since
    // a problem carries no stack traces, SQL or secrets (API-DM-09).
    const problem: Problem = {
      type: `urn:agendoxa:problem:${category.code.replaceAll('_', '-')}`,
      title: category.title,
      status,
      code: category.code,
      ...(category.reason ? { reason: category.reason } : {}),
      requestId,
      ...(exception instanceof RequestValidationException
        ? { errors: exception.issues }
        : {}),
    };

    // Overrides any cache header a handler set before failing: errors are
    // never cached by shared caches. Other headers, such as an optional
    // `Retry-After` set by a rate limiter, are left untouched.
    response
      .status(problem.status)
      .setHeader('Cache-Control', 'no-store')
      .setHeader('X-Request-Id', requestId)
      .type('application/problem+json')
      .send(JSON.stringify(problem));
  }
}
