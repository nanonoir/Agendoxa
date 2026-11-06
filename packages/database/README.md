# @agendoxa/database

Persistencia PostgreSQL/Drizzle para el servidor. El primer incremento contiene 17 entidades del núcleo; su alcance está en el [diseño de REP-02](../../docs/design-docs/rep-02-core-persistence.md). El frontend no debe importar este paquete.

## Arranque local

Desde la raíz, copiá `.env.example` a `.env` y mantené DATABASE_URL consistente con POSTGRES_*:

```bash
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

PostgreSQL 18 monta su volumen en `/var/lib/postgresql`; el puerto se publica solo en 127.0.0.1 (POSTGRES_PORT, 5432 por defecto). Detener el contenedor conserva los datos. Cambiar las credenciales de inicialización después de crear el volumen no cambia sus usuarios existentes. Los valores del ejemplo son públicos y solo para desarrollo local.

El seed requiere NODE_ENV=development. Agrega demo-barber y demo-club, servicios/recursos, horarios, clientes ficticios, roles y una membresía del operador en cada negocio. Sus IDs son estables y no sobrescribe registros existentes. No crea contraseñas ni login funcional. El catálogo reducido de permisos es un ejemplo de desarrollo.

## Migraciones y conexión

| Comando desde la raíz | Propósito |
|---|---|
| `pnpm db:generate --name change-name` | Generar SQL y snapshot del esquema, sin conexión a PostgreSQL |
| `pnpm db:check` | Comprobar metadata de migraciones; no diferencias contra una base en ejecución |
| `pnpm db:migrate` | Aplicar migraciones pendientes a DATABASE_URL y cerrar el pool |
| `pnpm db:seed` | Cargar los datos de desarrollo de forma repetible |

Para mecanismos SQL: `pnpm --filter @agendoxa/database exec drizzle-kit generate --custom --name change-name`, y editar el SQL creado. Versionar SQL, snapshots y journal juntos. No usar `drizzle-kit push`: no sustituye las migraciones ni sus garantías SQL manuales. Aplicar migraciones desde un único proceso controlado; nunca al iniciar cada instancia de API. Una migración publicada/aplicada es inmutable: se agrega otra para modificarla.

`0001_occupancy-history.sql` contiene la exclusión GiST y los triggers de historial fuera de la DSL. Debe conservarse al generar cambios posteriores. El ciclo Tenant.resource_rotation_cursor → Resource → Tenant es deliberado: las FK se agregan después de crear las tablas y el cursor se carga una vez creado el recurso.

Las referencias operativas incluyen tenant_id; User y Permission son globales por instalación. Los importes se devuelven como strings. Los casos de uso deberán mantener updated_at y resolver permisos, estados y políticas.

`0003_review-invariants.sql` mantiene activos los roles ADMIN/STAFF, exige autor vacío para reservas de WhatsApp y valida attendee_phone opcional en E.164. La compatibilidad servicio–recurso y la protección del último Admin requieren validaciones transaccionales de aplicación; sus responsables y criterios están explícitos en el [diseño del incremento](../../docs/design-docs/rep-02-core-persistence.md#row-checks-and-application-obligations).

Antes de comandos filtrados de API: `pnpm --filter @agendoxa/database build`. DatabaseModule exporta DATABASE_CONNECTION, tipado como DatabaseConnection, con un pool por aplicación, conexión diferida y cierre con NestJS. DATABASE_URL es obligatorio. GET /health sigue siendo una comprobación de vida sin consultar PostgreSQL.

## Pruebas de integración

```bash
pnpm db:test:up
pnpm test:db
pnpm --filter @agendoxa/api test:integration
```

postgres-test usa tmpfs y POSTGRES_TEST_PORT (5433 por defecto). DATABASE_URL_TEST debe nombrar una base `_test`. Los tests crean una base hija única y eliminan solo esa base; el rol necesita CREATEDB, disponible en el servicio local. No reinician la base de desarrollo. Los tests unitarios/HTTP siguen independientes de PostgreSQL.

Se verifican migraciones/seed repetidos, FK por negocio, unicidad por alcance, importes/rangos, concurrencia, fragmentos privados y rollback, historial inmutable, y conexión/cierre real de NestJS.

RLS no está activo. Las FK protegen referencias, no lecturas. Los primeros repositorios deberán exigir contexto autorizado y probar lecturas cruzadas. Los workflows completos de pagos, permisos, reservas, espera y jobs corresponden a otros incrementos.
