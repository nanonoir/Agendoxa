import { z } from "zod";
import { moneySchema } from "./common.js";

// Detalles de problema RFC 9457 (API-DM-09), espejo del schema `Problem` del
// OpenAPI de CON-02. Es estricto: no admite propiedades no declaradas.
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

// Instante UTC RFC 3339 con sufijo `Z` (schema `Instant`).
const instantSchema = z
  .string()
  .regex(
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$/,
  );

// Con la razón `late_change_requires_acceptance` (schema `LateChangeNotice`).
export const lateChangeNoticeSchema = z.strictObject({
  noticeMinutes: z.int().min(0),
  startAt: instantSchema,
  depositRefundPolicy: z.enum(["NO_MONEY_BACK", "REFUND_POSSIBLE"]).nullable(),
});

// Con una razón de asignación (schema `AllocationLimit`).
export const allocationLimitSchema = z.strictObject({
  index: z.int().min(0),
  chargeBalance: moneySchema,
  availableFunds: moneySchema,
});

export const problemSchema = z.strictObject({
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
    .array(z.strictObject({ path: z.string(), message: z.string() }))
    .optional(),
  lateChange: lateChangeNoticeSchema.optional(),
  // Con la razón `stale_revision`: la revisión actual de la sesión (API-DM-18).
  currentRevision: z.int().min(0).optional(),
  allocationLimit: allocationLimitSchema.optional(),
});

export type ProblemCode = z.infer<typeof problemCodeSchema>;
export type LateChangeNotice = z.infer<typeof lateChangeNoticeSchema>;
export type AllocationLimit = z.infer<typeof allocationLimitSchema>;
export type Problem = z.infer<typeof problemSchema>;
