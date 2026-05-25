# ADR-0002: Backend con NestJS y arquitectura hexagonal

**Fecha:** 2026-05-25
**Estado:** Aceptado

## Contexto y problema

Necesitamos un backend TypeScript, API-first, con una estructura que aísle las reglas de
negocio de los detalles (framework, base de datos, proveedores). Debe ser testeable y crecer
por dominios sin convertirse en un plato de espaguetis.

## Opciones consideradas

1. **Express + arquitectura hexagonal a medida** — máximo control, pero cableas DI, validación
   y módulos a mano (mucho _boilerplate_).
2. **NestJS** — DI nativa, módulos, guards, _pipes_ de validación, OpenAPI y WebSockets de fábrica.
3. **Fastify + capa propia** — más rápido en _benchmarks_, pero misma carga de cableado que Express.

## Decisión

NestJS, organizado por **bounded contexts** (_screaming architecture_) y con cuatro capas por
contexto: `domain` (TS puro), `application` (casos de uso + puertos), `infrastructure`
(adaptadores) e `interface` (controllers). El `*.module.ts` de cada contexto liga puerto→adaptador.

## Consecuencias

**A favor**

- La DI de Nest encaja de forma natural con los puertos: inyectamos adaptadores sin acoplar el dominio.
- Validación, guards, OpenAPI y testing vienen resueltos: escribimos dominio, no plomería.
- La estructura "grita" el negocio (family, shopping...), no el framework.

**En contra / trade-offs**

- NestJS es opinado y añade una capa de abstracción que hay que conocer.
- La disciplina de capas exige revisión: es fácil colar un import de infraestructura en el dominio
  (lo vigilamos con la convención y, más adelante, reglas de ESLint de fronteras).

## Notas de implementación

El dominio no importa `@nestjs/*` ni Supabase. Los tests unitarios instancian casos de uso con
dobles de los puertos; la integración usa el `Test.createTestingModule` de Nest contra Supabase local.
