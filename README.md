# Cosas de Casa

App PWA para gestionar las cosas de casa en familia: lista de la compra (con voz e IA),
tareas, nevera, calendario, planes y más. Pensada para usarse en familia y compartir con
familias amigas.

**Stack:** TypeScript · NestJS (arquitectura hexagonal) · React 19 + Vite (PWA offline-first)
· PostgreSQL + pgvector vía Supabase · monorepo pnpm + Turborepo.

## Requisitos

- Node 20+
- pnpm 11+
- Docker (para el stack local de Supabase)

## Arranque rápido

```bash
pnpm install
pnpm db:start      # levanta Supabase local (Postgres + Auth + Realtime + Storage)
pnpm dev           # arranca la API (apps/api) y la web (apps/web)
```

## Estructura

- `apps/api` — backend NestJS (hexagonal, por contextos de dominio).
- `apps/web` — frontend React + Vite (PWA).
- `packages/*` — contratos compartidos y configuración común.
- `docs/` — plan, decisiones de arquitectura (ADR) y sección didáctica con el porqué de cada decisión.

## Documentación

Empieza por `docs/` para entender la arquitectura, el roadmap y cómo trabajamos.
Cada decisión relevante queda registrada como ADR en `docs/adr/`.
