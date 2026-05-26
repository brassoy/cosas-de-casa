# Tests y cobertura

Estado de la suite de `apps/api` y propuesta priorizada de los tests que faltan — en particular los
**negativos**: comprobar que la API **no hace lo que no debe**.

## Estado actual de la suite

Ejecutada el 2026-05-27. **Todo en verde.**

| Suite | Archivos | Tests | Resultado |
|---|---|---|---|
| Unitarios (Vitest) | 35 | 318 | 🟢 318/318 |
| Integración (contra Supabase local real) | 14 | 188 | 🟢 188/188 |
| **Total** | **49** | **506** | **🟢 0 fallos** |

Comandos: `pnpm -C apps/api test` (unitarios) · `pnpm -C apps/api test:integration` (E2E).

> Los tests de integración corren contra una instancia **real** de Supabase local (no mocks), con
> ejecución secuencial (`singleFork`) para evitar carreras de BD.

## Cobertura: no hay tooling

`@vitest/coverage-v8` **no está instalado**, así que `--coverage` falla y **no hay métrica objetiva**
de cobertura. Es lo primero a resolver (ver [buenas-practicas.md](./buenas-practicas.md)).

Estimación por capas (a falta de métrica):

| Capa | Cobertura |
|---|---|
| Dominio + aplicación (la mayoría de contextos) | buena vía tests unitarios |
| Controllers, repos (infraestructura) | **sin unitarios**; cubiertos indirectamente por integración |
| `plans`, `social` | **sin ningún unitario** — solo integración |
| Flujos E2E por contexto | un suite de integración por contexto |

El **gap real** no es de cantidad sino de tipo: faltan tests **negativos** y de **autorización**.

## Matriz de tests propuestos (priorizada)

Lo que de verdad responde a "¿hace lo que debe y NO lo que no debe?":

### 🔴 Prioridad alta — Autorización / IDOR

Es el riesgo de seguridad nº 1 y hoy no hay un test que lo verifique de forma directa.

- **Cross-family en cada scope guard**: con el token de un usuario de la familia A, intentar
  `GET/PATCH/DELETE` sobre un `:id` de la familia B (lista, ítem, tarea, ticket, evento, ítem de
  nevera) → debe devolver **403/404**.
- **`plans` y `social` primero**: no tienen scope guard declarativo (la autz vive en el use case), así
  que un fallo aquí es más probable. Cubrir cada caso de uso: acceso a plan no compartido, canje de
  PIN de familia ajena, borrado de vínculo sin pertenecer.
- **Roles**: un `MEMBER` (no `OWNER`) intentando `POST /families/:id/join-pins` → 403.
- **Pareja**: un miembro de la familia que NO es de la pareja accediendo a `/couples/:id/notes` → 403.

### 🟠 Prioridad media — Validación de límites (tests negativos)

- Enviar campos fuera de contrato y esperar **400**: `name` con `maxLength+1`, `quantity` negativa,
  `purchaseLink` no-URL, propiedades no declaradas (debe saltar `forbidNonWhitelisted`).
- **Regresión de los fixes** recién aplicados: PIN de amistad con `I/L/O/U` → 400 (antes pasaba el DTO);
  `familyId` no-UUID → 400; `quantity` negativa en nevera → 400.

### 🟠 Prioridad media — Transiciones de estado y reglas de dominio

- `fridge`: `eat` con `amount > quantity` → 409 (`InsufficientQuantity`).
- `plans`: `share` de un plan ya compartido → 422 (`PlanAlreadyShared`); compartir sin amistad → 422.
- `tasks`: transiciones de estado inválidas según la matriz de `domain/task.ts`.

### 🟡 Prioridad media — Idempotencia y duplicados

- Canjear el mismo PIN dos veces; unirse a una familia de la que ya eres miembro; `redeem` de amistad
  ya existente (debe devolver el vínculo, no duplicar).

### 🟡 Prioridad baja — Recurso inexistente

- Cualquier `:id` inexistente → 404 consistente vía el *error filter* de cada contexto.

## Cómo encarar la escritura (cuando se decida)

1. Empezar por **un helper de autorización** reutilizable (crear familia A y B, dos usuarios, dos
   tokens) y barrer el cross-family de todos los scope guards: máximo valor, mínimo código.
2. Tests negativos de validación: tabla de casos por DTO, baratos y muy efectivos como red de regresión.
3. Subir cobertura de `plans` y `social` (los que hoy no tienen unitarios).
