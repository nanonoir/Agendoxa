import { z } from "zod";

// Representaciones comunes de CON-02 (API-DM-04). Se agregan a medida que un
// endpoint implementado las necesita.

export const uuidSchema = z.uuid();

// Decimal exacto, no negativo, con dos decimales; nunca un número JSON.
export const moneySchema = z
  .string()
  .regex(
    /^(0|[1-9][0-9]{0,9})\.[0-9]{2}$/,
    "Must be a decimal string with two places, such as 8000.00",
  );

// Selecciona un negocio para mostrarlo; nunca autoriza (TEN-DM-07).
export const slugSchema = z
  .string()
  .max(63)
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Must be lowercase letters and digits separated by single hyphens",
  );

export type Uuid = z.infer<typeof uuidSchema>;
export type Money = z.infer<typeof moneySchema>;
export type Slug = z.infer<typeof slugSchema>;
