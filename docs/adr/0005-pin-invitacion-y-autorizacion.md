# ADR-0005: PIN de invitación de un solo uso y autorización por capas

**Fecha:** 2026-05-26
**Estado:** Aceptado

## Contexto y problema

Para unirse a una unidad familiar se usa un PIN que el propietario genera y comparte
(WhatsApp/Telegram). Debe ser de **un solo uso**, difícil de adivinar, y a prueba de carreras
(dos personas no pueden canjear el mismo PIN).

## Decisión

- **Formato**: 8 caracteres **Crockford Base32** (`0-9 A-Z` sin `I L O U`): alta entropía y sin
  caracteres ambiguos al dictar/compartir.
- **Almacenamiento**: solo el **hash scrypt** con una _pepper_ de servidor (`JOIN_PIN_PEPPER`). El
  hash es determinista (permite localizar por `code_hash` en el consumo) y resiste ataques offline
  si se filtra la tabla. Comparación con `timingSafeEqual`.
- **Consumo ATÓMICO** (anti-carrera): un único `UPDATE join_pins SET status='CONSUMED', ...
  WHERE code_hash=$1 AND status='ACTIVE' AND expires_at > now() RETURNING family_id`. Gana
  exactamente uno; el resto ve 0 filas → error. Alta de membership idempotente (`ON CONFLICT DO NOTHING`).
- **Invariantes**: ≤ 1 PIN `ACTIVE` por familia (índice único parcial); solo OWNER genera/revoca;
  expiración 24 h; generar uno nuevo revoca el `ACTIVE` anterior.

### Autorización por capas

- **Enforcement PRIMARIO (implementado)**: `JwtAuthGuard` (autenticación) + `FamilyScopeGuard`
  (pertenencia a la familia de la ruta) + `@Roles('OWNER')` para operaciones de propietario.
- **RLS en Postgres (DIFERIDO)**: como el backend usa `node-postgres` con un rol fijo, una RLS real
  por petición exige `SET LOCAL request.jwt.claims` por transacción. Se pospone a un paso de
  _hardening_ deliberado (defensa en profundidad). Hoy el control de acceso está cubierto por **19
  tests de integración** (401 sin token, 403 no-miembro/no-owner, 422 PIN no canjeable).

## Consecuencias

**A favor**: seguro, atómico y compartible; el dominio del PIN es TS puro y testeable.

**En contra / trade-offs**: sin RLS todavía → la BD no es una segunda barrera. Riesgo mitigado por
los guards + cobertura de integración; queda como TODO de hardening (idealmente al ampliar el
esquema en fases siguientes).

## Notas de implementación

`apps/api/src/contexts/family/` (dominio `join-pin.ts`, `join-pin-code.ts`; `scrypt-hasher.ts`;
caso de uso `join-family-by-pin.use-case.ts` con el `UPDATE` atómico vía `UnitOfWork`).
