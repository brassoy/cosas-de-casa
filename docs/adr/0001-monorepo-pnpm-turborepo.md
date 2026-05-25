# ADR-0001: Monorepo con pnpm workspaces + Turborepo

**Fecha:** 2026-05-25
**Estado:** Aceptado

## Contexto y problema

El backend (NestJS) y el frontend (React) comparten tipos y contratos de API. Necesitamos
evitar que se desincronicen y poder mover código común sin publicar paquetes en un registro.

## Opciones consideradas

1. **Dos repositorios separados** + un paquete npm publicado para los tipos compartidos.
2. **Monorepo** con pnpm workspaces + Turborepo.

## Decisión

Monorepo. `apps/api`, `apps/web` y `packages/*` (contracts, config). Los tipos y esquemas
viven en `@cosasdecasa/contracts` y los consumen ambos lados con `workspace:*`.

## Consecuencias

**A favor**

- Tipos compartidos sin _drift_: un cambio de contrato rompe en compilación, no en producción.
- Turborepo cachea tareas (build/test/lint) por hash de contenido: el CI va tan rápido como local.
- pnpm enlaza dependencias por _hard-link_: nada de `node_modules` gigantes duplicados.

**En contra / trade-offs**

- El _tooling_ de monorepo (pipelines de turbo, resolución de workspace) tiene curva inicial.
- Hay que cuidar la interoperabilidad CJS/ESM entre paquetes: por eso `contracts` compila a CommonJS.

## Notas de implementación

`pnpm-workspace.yaml` declara `apps/*` y `packages/*`. `turbo.json` define el grafo de tareas.
La base estricta de TypeScript está en `tsconfig.base.json` y cada paquete la extiende.
