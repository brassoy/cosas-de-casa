# Arquitectura hexagonal por contexto

→ Decisiones fundacionales: ADR-0002 (NestJS hexagonal).

## El problema que resuelve

Imagina que mañana decides cambiar Supabase por otra base de datos, o que el proveedor de IA
cambia su API. Si el código de negocio está mezclado con el código de infraestructura, ese
cambio se propaga por todo el sistema. La arquitectura hexagonal te protege de ese acoplamiento.

La regla es simple: **el dominio no sabe que existe NestJS, Drizzle ni Supabase**. El dominio
solo conoce sus propias reglas y los puertos que define.

## La estructura de cada contexto

Cada contexto de negocio (tasks, fridge, calendar, etc.) sigue siempre la misma estructura:

```
contexts/<nombre>/
  domain/           ← reglas de negocio puras
    <entidad>.ts    ← agregados y entidades (TypeScript puro, sin imports externos)
    <entidad>.errors.ts
    ports/          ← interfaces que el dominio EXIGE al exterior
      <algo>.repository.ts
      <algo>.port.ts
  application/      ← casos de uso (orquestación)
    <accion>.use-case.ts
    ports/          ← puertos de infraestructura transversal (clock, id-generator)
  infrastructure/   ← adaptadores (implementaciones concretas de los puertos)
    drizzle-<algo>.repository.ts
    <proveedor>-<algo>.adapter.ts
  interface/        ← capa HTTP (NestJS controllers, DTOs, guards, filtros)
    dto/
    <contexto>.controller.ts
    <contexto>.presenter.ts
  <contexto>.module.ts
```

## Por qué cada capa solo habla con la que tiene debajo

- `domain` no importa nada de fuera: ni NestJS, ni Drizzle, ni ningún SDK.
- `application` importa el dominio y declara puertos (interfaces). No importa infraestructura.
- `infrastructure` implementa los puertos del dominio y de la aplicación.
- `interface` importa los casos de uso y los DTOs de `@cosasdecasa/contracts`.

Cuando el controller recibe una petición HTTP, llama al caso de uso. El caso de uso trabaja
con el dominio y llama a los puertos. NestJS inyecta las implementaciones concretas.

## Los puertos de infraestructura transversal

Todos los contextos con estado tienen dos puertos de aplicación comunes:

- `Clock` — proporciona `now(): Date`. Los tests inyectan un reloj controlado.
- `IdGenerator` — proporciona `generate(): string`. En producción genera UUIDs v4.

¿Por qué? Porque si el dominio llama a `new Date()` o `uuid()` directamente, no puedes
controlar el tiempo ni los ids en los tests. Al inyectarlos, el dominio es predecible.

## Cómo testear en este esquema

- **Tests unitarios** (sin I/O): instancian el agregado directamente y verifican sus
  invariantes. No necesitan NestJS ni base de datos.
- **Tests de aplicación**: crean el caso de uso con mocks de los repositorios y el reloj.
- **Tests de integración**: usan Supertest + Supabase local. Verifican la stack completa
  sin mocks.

## El truco del guard de contexto

Cada contexto con recursos propios tiene un guard que verifica que el recurso solicitado
pertenece a la familia del usuario autenticado:

```
TaskScopeGuard → busca la tarea → verifica task.familyId === user.familyId
FridgeItemScopeGuard → busca el ítem → verifica item.familyId === user.familyId
```

Esto evita que el controlador tenga que repetir la lógica de autorización en cada endpoint.
