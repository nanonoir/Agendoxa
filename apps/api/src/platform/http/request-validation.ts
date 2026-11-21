import { BadRequestException } from '@nestjs/common';

export interface ValidationIssue {
  path: string;
  message: string;
}

/** The part of a shared Zod schema that request validation relies on. */
interface ContractSchema<T> {
  safeParse(value: unknown):
    | { success: true; data: T }
    | {
        success: false;
        error: {
          issues: readonly { path: readonly PropertyKey[]; message: string }[];
        };
      };
}

/** A request that does not match its shared contract (API-DM-09 `validation`). */
export class RequestValidationException extends BadRequestException {
  constructor(readonly issues: ValidationIssue[]) {
    super('The request does not match the contract');
  }
}

/**
 * Validates one request part with a shared schema from `@agendoxa/shared`.
 * `pointer` is the JSON Pointer of that part, such as `/slug` for a path
 * parameter.
 */
export function parseRequest<T>(
  schema: ContractSchema<T>,
  value: unknown,
  pointer: string,
): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new RequestValidationException(
    result.error.issues.map((issue) => ({
      path: [pointer, ...issue.path.map(String)].join('/'),
      message: issue.message,
    })),
  );
}
