# Agendoxa

Plataforma modular de reservas y turnos. Monorepo con pnpm workspaces y Turborepo.

## Requisitos

- Node.js 24 (ver `.nvmrc`)
- pnpm 12.16.1 (`npm i -g pnpm@12.16.1`)

## Arranque

```bash
git clone https://github.com/nanonoir/Agendoxa.git
cd Agendoxa
pnpm install
cp .env.example .env
pnpm dev
```

`pnpm dev` compila primero `packages/shared` y después levanta la web y la API.

## Puertos

| App | URL |
|---|---|
| Web (Next.js) | http://localhost:3000 |
| API (NestJS) | http://localhost:3001 (`GET /health` devuelve `{"status":"ok"}`) |

## Variables de entorno

- El `.env` de la raíz lo lee la API al arrancar, si existe. Se crea a mano copiando `.env.example`.
- La web no lee el `.env` de la raíz. Si necesita variables `NEXT_PUBLIC_*`, van en `apps/web/.env.local`.
- `DATABASE_URL` no se usa hasta REP-02.

## Comandos

Se corren desde la raíz. Turborepo ejecuta el script en cada paquete que lo tenga.

| Comando | Qué hace | Dónde corre |
|---|---|---|
| `pnpm dev` | Levanta las apps en modo desarrollo | web (`next dev`), api (`nest start --watch`) |
| `pnpm build` | Compila paquetes y apps | shared (`tsc`), web (`next build`), api (`nest build`) |
| `pnpm lint` | Revisa el código | web (ESLint), api (oxlint) |
| `pnpm typecheck` | Verifica tipos de TypeScript | web, api, shared |
| `pnpm test` | Corre los tests | api (Vitest) |

## Estructura

```text
apps/
  web/          # Next.js (App Router, TypeScript, Tailwind): CRM y landing
  api/          # NestJS: API REST del core de reservas
packages/
  shared/       # Contratos, tipos y esquemas Zod compartidos entre web y api
  database/     # Acceso a datos con Drizzle (se completa en REP-02)
```
