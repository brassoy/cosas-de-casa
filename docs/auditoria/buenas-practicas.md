# Buenas prácticas — recomendaciones

Acciones para subir la calidad y la mantenibilidad de la API, ordenadas por relación valor/esfuerzo.
Salen de la auditoría de [casos de uso](../casos-de-uso.md), [contratos](./contratos.md),
[seguridad](./seguridad-endpoints.md) y [tests](./tests-cobertura.md).

## 1. 🔴 Integración continua (CI) — hoy ausente

`.github/workflows/` está vacío: nada impide que entre código que rompe tipos, lint o tests. Con 506
tests en verde, es un desperdicio no ejecutarlos en cada PR.

**Acción**: pipeline que en cada PR corra `lint` + `type-check` + `test` (y `test:integration` con un
Supabase de CI). Es la mayor mejora de calidad por el menor esfuerzo.

## 2. 🔴 Una sola fuente de verdad para la validación

Conviven `class-validator` (DTOs) y Zod (`packages/contracts`) sin sincronización. Es la **causa raíz**
de casi todo el drift de [contratos.md](./contratos.md): fechas, cantidades, UUID, longitudes que
divergen sin que nada lo note.

**Acción**: adoptar **`nestjs-zod`** (derivar DTOs y validación de los schemas Zod del contrato
compartido) o validar en el controller con un `ZodValidationPipe`. El contrato pasa a ser la única
verdad y desaparece toda una clase de bugs.

## 3. 🟠 Cobertura: tooling + umbral

`@vitest/coverage-v8` no está instalado, así que no hay métrica de cobertura ni nada que la proteja.

**Acción**: instalar `@vitest/coverage-v8`, exponer `pnpm test:cov`, y fijar un `coverageThreshold`
realista (p. ej. dominio+aplicación ≥ 80 %) que el CI haga cumplir. Subirlo de forma gradual.

## 4. 🟠 Documentación de la API (Swagger incompleto)

Swagger está montado en `/api/docs`, pero `@ApiProperty` apenas se usa: el spec OpenAPI se autogenera
casi sin descripciones ni ejemplos. Si `contracts` ya es Zod, se puede generar OpenAPI desde ahí
(p. ej. `zod-to-openapi`) y matar dos pájaros con la recomendación nº 2.

## 5. 🟠 Endurecer secretos y rate limit en producción

- `JOIN_PIN_PEPPER`: hacer que la API **no levante** si sigue con el valor por defecto y
  `NODE_ENV=production` (un `superRefine` en el schema de entorno).
- `/ai/extract-items`: añadir `@RateLimit()` (hoy es el único endpoint de IA sin límite).
- Rate limit en memoria: migrar a Redis si se despliega en más de una instancia (ADR-0008 ya lo prevé).

## 6. 🟡 Hooks de pre-commit

No hay `husky`/`lint-staged`. Un hook que corra `lint` + `type-check` sobre lo *staged* atrapa errores
antes del commit y descarga al CI.

## 7. 🟡 Limpieza y consistencia

- **Código muerto**: `ToggleItemCheckedUseCase` no se inyecta en ningún sitio (el toggle va por
  `UpdateItemUseCase`). Eliminarlo o darle endpoint.
- **Patrón de autorización**: unificar el de `plans`/`social` (autz en use case) con el resto (scope
  guard declarativo). Ver [seguridad-endpoints.md](./seguridad-endpoints.md), hallazgo S3.
- **Presenters**: `menu/to-list` devuelve el resultado del use case sin pasar por presenter; introducir
  uno para no acoplar la capa interface al tipo de aplicación.

## Orden sugerido

1. CI (nº 1) — protege todo lo demás desde ya.
2. `nestjs-zod` (nº 2) — elimina una clase entera de bugs y habilita la nº 4.
3. Cobertura + umbral (nº 3) junto con los tests de autorización de [tests-cobertura.md](./tests-cobertura.md).
4. Endurecer prod (nº 5) antes del primer despliegue serio.
5. El resto, de forma oportunista.
