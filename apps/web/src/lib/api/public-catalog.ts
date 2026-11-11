import { publicServiceListSchema, type PublicServiceList } from "@agendoxa/shared";

// Server-side only: API_BASE_URL is not a NEXT_PUBLIC_ variable, so it never
// reaches the browser bundle.
const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

/**
 * Active services of the business a landing slug names, as the API returns
 * them. Returns null when the API reports no such business (404) or rejects
 * the slug (400); any other failure is thrown.
 */
export async function listPublicServices(slug: string): Promise<PublicServiceList | null> {
  const response = await fetch(
    `${apiBaseUrl}/api/v1/public/businesses/${encodeURIComponent(slug)}/services`,
    { cache: "no-store" },
  );
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) {
    throw new Error(`Public catalog request failed with status ${response.status}`);
  }
  return publicServiceListSchema.parse(await response.json());
}
