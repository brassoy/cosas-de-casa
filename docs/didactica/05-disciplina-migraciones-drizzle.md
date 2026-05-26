# Disciplina de migraciones con Drizzle Kit

→ Decisión de referencia: ADR-0015 (cadena limpia, un solo propietario de schema).

## Cómo funciona Drizzle Kit

Drizzle Kit compara el schema TypeScript (`schema.ts`) con el último snapshot guardado en el
directorio `drizzle/` y genera el SQL diferencial. El resultado es una nueva migración en el
journal (`_journal.json`) y un snapshot actualizado.

El journal es la historia de todos los cambios de schema. Si dos personas (o dos agentes)
modifican `schema.ts` en paralelo y cada uno genera su migración, el journal queda
desincronizado: los snapshots se contradicen y la cadena de migraciones produce errores al
aplicar.

## La regla de oro

**Un solo propietario del schema por fase.** Ningún subagente modifica `schema.ts` mientras
otro ya está generando una migración o completando un conjunto de cambios de schema.

En práctica, esto significa:
1. Todos los cambios de schema de una fase se hacen en serie, no en paralelo.
2. Solo se ejecuta `drizzle-kit generate` cuando el schema está completo para ese conjunto
   de cambios.
3. Solo se ejecuta `drizzle-kit migrate` (o `push` en dev) después de generar.

## Cuándo regenerar la cadena desde cero

Si el journal tiene incoherencias (snapshots huérfanos, referencias a tablas renombradas,
errores al aplicar), el procedimiento es:

```bash
# 1. Borrar el directorio de migraciones
rm -rf apps/api/drizzle/

# 2. Generar una sola migración acumulativa
cd apps/api && npx drizzle-kit generate

# 3. En la base de datos de desarrollo, resetear y reaplicar
# (usa supabase db reset o equivalente)
```

El resultado es una sola migración SQL que crea todo el schema en su estado actual.
Esta migración es equivalente a todas las anteriores combinadas.

## Lo que Drizzle Kit NO genera automáticamente

- `CREATE EXTENSION vector` (para pgvector).
- `CREATE EXTENSION "uuid-ossp"` (si se usa en funciones por defecto).
- Índices especiales (HNSW, GiST).

Hay que añadirlos manualmente al SQL generado antes de aplicar la migración.

## Flujo correcto en desarrollo

```
1. Modificar schema.ts
2. pnpm --filter api drizzle:generate   → genera la migración
3. Revisar el SQL generado (nunca confiar ciegamente)
4. pnpm --filter api drizzle:migrate    → aplica en la BD local
5. Si algo falla, corregir schema.ts y volver al paso 2
```

## Regla de producción

Nunca editar el SQL de una migración ya aplicada en producción. Si hay un error, se crea una
nueva migración que lo corrige. Editar una migración aplicada rompe el control de versiones
y puede dejar la BD en estado inconsistente.

## Por qué esto importa más en proyectos multi-agente

En este proyecto, varios subagentes pueden trabajar en paralelo en distintas partes del
código. La tentación es que cada subagente añada sus tablas al schema independientemente.
Eso rompe el journal. La solución es que el coordinador serialice todas las modificaciones
de schema en un solo paso al final de cada fase.
