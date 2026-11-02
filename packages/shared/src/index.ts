import { z } from "zod";

// Contrato de la respuesta de GET /health.
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
