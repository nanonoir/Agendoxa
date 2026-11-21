import { notFound } from "next/navigation";
import { listPublicServices } from "@/lib/api/public-catalog";

// Display formatting only: groups the API's exact decimal string without
// converting it to a float. Prices are decided by the API, never here.
// The public contract has no currency yet, so no symbol is shown.
function formatAmount(price: string): string {
  const [integer, decimals] = price.split(".");
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimals}`;
}

export default async function BusinessServicesPage({
  params,
}: PageProps<"/businesses/[slug]">) {
  const { slug } = await params;
  const catalog = await listPublicServices(slug);
  if (!catalog) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{slug}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Servicios</h1>
      </header>

      {catalog.items.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          Este negocio todavía no publicó servicios.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {catalog.items.map((service) => (
            <li
              key={service.id}
              className="flex items-start justify-between gap-4 py-4"
            >
              <div className="flex flex-col gap-1">
                <h2 className="font-medium">{service.name}</h2>
                {service.description ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {service.description}
                  </p>
                ) : null}
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {service.durationMinutes} min
                </p>
              </div>
              <p className="font-medium tabular-nums">
                {formatAmount(service.price)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
