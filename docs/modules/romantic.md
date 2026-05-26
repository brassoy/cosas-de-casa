# Módulo: romantic (rincón de pareja)

## Responsabilidad

Espacio privado dentro de una familia para la pareja: notas compartidas, retos de actividades
y el botón de "maldad" (notificación push divertida al partner).

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `Couple` | Aggregate root | Par de usuarios en el contexto de una familia |
| `CoupleNote` | Entidad | Nota escrita por uno de los miembros de la pareja |
| `CoupleChallenge` | Entidad | Estado de un reto del catálogo para esta pareja |

**Invariante de `Couple`**: los dos miembros deben ser distintos (`CannotCoupleWithSelfError`).
El par `(familyId, userA, userB)` es único (también reforzado por la BD).

**Privacidad**: el `CoupleScopeGuard` verifica `couple.isMember(userId)` antes de cualquier
operación sobre `/:coupleId`. Solo los dos miembros acceden a sus notas y retos.

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| POST | `/families/:familyId/couple` | Crear pareja en la familia |
| GET | `/families/:familyId/couple` | Obtener la pareja del usuario autenticado |
| POST | `/couples/:coupleId/notes` | Añadir nota de pareja |
| GET | `/couples/:coupleId/notes` | Listar notas |
| POST | `/couples/:coupleId/challenges` | Añadir reto del catálogo |
| GET | `/couples/:coupleId/challenges` | Listar retos |
| POST | `/couples/:coupleId/challenges/done` | Marcar reto como completado |
| POST | `/couples/:coupleId/mischief` | Enviar notificación push divertida al partner |

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `CoupleRepository` | `DrizzleCoupleRepository` | Persistencia de parejas |
| `CoupleNoteRepository` | `DrizzleCoupleNoteRepository` | Persistencia de notas |
| `CoupleChallengeRepository` | `DrizzleCoupleChallengeRepository` | Persistencia de retos |
| `Clock` | `SystemClock` | Inyección de tiempo |
| `IdGenerator` | `UuidIdGenerator` | Generación de UUIDs |

## Decisiones locales

- El catálogo de retos (`challenge-catalog.ts`) es un array estático en el dominio, no una
  tabla de base de datos. Para el MVP es suficiente; se puede migrar a tabla configurable
  en el futuro.
- `DoMischiefUseCase` usa el `NotificationSenderPort` del contexto `notifications` para
  enviar la notificación push; la frase se elige aleatoriamente de `mischief-phrases.ts`.
- La pareja almacena `userA` (creador) y `userB` (partner), pero la privacidad se basa en
  pertenecer al par independientemente del rol.
