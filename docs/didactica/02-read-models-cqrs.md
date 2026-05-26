# Read models y CQRS en este proyecto

→ Decisión de referencia: ADR-0011 (estadísticas).

## El principio

CQRS significa separar las operaciones que modifican estado (comandos) de las que solo leen
(queries). No es una tecnología; es una separación de responsabilidades.

En este proyecto aplicamos la parte de separación de lectura de forma pragmática: cuando
necesitamos datos que cruzan los límites de varios contextos, creamos un **read model**
dedicado en lugar de ensamblar la respuesta desde múltiples repositorios en el caso de uso.

## Cuándo usar un repositorio y cuándo un read model

Usa el repositorio cuando:
- Necesitas el agregado completo para aplicar lógica de negocio.
- Vas a modificar el estado (crear, actualizar, eliminar).

Usa un read model cuando:
- Solo necesitas leer datos para mostrarlos.
- La vista cruza tablas de varios contextos (joins que ningún repositorio individual cubriría).
- El aggregado de escritura tiene una forma diferente a lo que el cliente necesita ver.

## Ejemplos en este proyecto

### FamilyStatsQuery (stats/application/)

Agrega datos de tres contextos distintos (shopping, tasks, fridge) con SQL puro. No hay tabla
de proyección: la query se lanza contra las tablas originales cada vez. Es correcto para el
MVP porque:
- Los datos siempre son exactos (no hay lag de proyección).
- El volumen es pequeño (pocos miembros por familia).
- La lógica de puntuación puede cambiar sin reconstruir nada.

### DrizzlePlansReadModel (plans/infrastructure/)

Devuelve la vista detalle de un plan con los participantes enriquecidos (join con `app_users`
para obtener `displayName`). El repositorio de `Plan` solo devuelve los ids de participantes;
el read model añade el contexto de usuario.

### DrizzleGroupMembersReadModel (groups/infrastructure/)

Lo mismo para los miembros de una peña.

### DrizzleSocialReadModel (social/infrastructure/)

Familias amigas con su nombre e imagen.

## La regla de los ports en read models

Los read models más simples se implementan directamente en la infraestructura. Los que
necesitan ser sustituibles (p. ej. en tests) se declaran como puerto en `application/ports/`:

```typescript
// plans/application/ports/plans-read-model.ts
export interface PlansReadModel {
  getPlanDetail(planId: string): Promise<PlanDetailView | null>;
}
```

La implementación concreta `DrizzlePlansReadModel` vive en `infrastructure/`.
El módulo NestJS inyecta una u otra.

## Cuándo escalar a proyecciones

Si el volumen crece y las queries de `FamilyStatsQuery` se vuelven lentas, el siguiente paso
es añadir una tabla `member_stats` pre-calculada y un proceso que la actualice cuando
cambian los datos de los contextos fuente. Ese es el modelo de proyección completo.
Por ahora, la agregación SQL es suficiente y evita toda esa complejidad.
