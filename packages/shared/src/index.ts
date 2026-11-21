import { z } from "zod";

// Contrato de la respuesta de GET /health.
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

// Contratos HTTP de CON-02 (API-DM-14), creados con el primer endpoint que los usa.
export {
  moneySchema,
  slugSchema,
  uuidSchema,
  type Money,
  type Slug,
  type Uuid,
} from "./contracts/common.js";
export {
  publicServiceListSchema,
  publicServiceSchema,
  type PublicService,
  type PublicServiceList,
} from "./contracts/catalog.js";
export {
  allocationLimitSchema,
  lateChangeNoticeSchema,
  problemCodeSchema,
  problemSchema,
  type AllocationLimit,
  type LateChangeNotice,
  type Problem,
  type ProblemCode,
} from "./contracts/problem.js";
