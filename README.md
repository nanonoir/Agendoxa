# Agendoxa

Plataforma modular de reservas y turnos. Monorepo con pnpm workspaces y Turborepo.

## Requisitos

- Node.js 24 LTS o superior
- pnpm (`npm i -g pnpm`)

## Arranque

```bash
git clone https://github.com/nanonoir/Agendoxa.git
cd Agendoxa
pnpm install
cp .env.example .env
pnpm dev
```

La web queda en http://localhost:3000.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Levanta las apps en modo desarrollo |
| `pnpm build` | Compila todos los paquetes y apps |
| `pnpm lint` | Corre ESLint |
| `pnpm typecheck` | Verifica tipos de TypeScript |

## Estructura

```text
apps/
  web/          # Next.js (App Router, TypeScript, Tailwind)
packages/
  shared/       # Contratos, tipos y esquemas Zod compartidos
  database/     # Acceso a datos (Drizzle, a partir de REP-02)
```
