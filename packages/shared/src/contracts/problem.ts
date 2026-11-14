import { z } from "zod";

// Detalles de problema RFC 9457 (API-DM-09). Los campos específicos de otros
// flujos (lateChange, currentRevision, allocationLimit) se agregan con ellos.
export const problemCodeSchema = z.enum([
  "validation",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rule_violation",
  "external_dependency",
  "internal",
]);

export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.int().min(400).max(599),
  code: problemCodeSchema,
  reason: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .optional(),
  detail: z.string().optional(),
  requestId: z.string(),
  errors: z
    .array(z.object({ path: z.string(), message: z.string() }))
    .optional(),
});

export type ProblemCode = z.infer<typeof problemCodeSchema>;
export type Problem = z.infer<typeof problemSchema>;
