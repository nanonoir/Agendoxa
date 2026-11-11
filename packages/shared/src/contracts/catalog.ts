import { z } from "zod";
import { moneySchema, uuidSchema } from "./common.js";

// Respuesta de GET /api/v1/public/businesses/{slug}/services (listPublicServices).
export const publicServiceSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.int().min(1),
  price: moneySchema,
});

export const publicServiceListSchema = z.object({
  items: z.array(publicServiceSchema),
});

export type PublicService = z.infer<typeof publicServiceSchema>;
export type PublicServiceList = z.infer<typeof publicServiceListSchema>;
