import type { INestApplication } from '@nestjs/common';
import { ProblemDetailsFilter } from './problem-details.filter.js';

/**
 * HTTP conventions shared by `main.ts` and the HTTP tests, so both serve the
 * same contract: every endpoint under `/api/v1` except `GET /health`
 * (API-DM-03), and errors as problem details (API-DM-09).
 */
export function configureHttp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalFilters(new ProblemDetailsFilter());
}
