# Módulo: identity-access (autenticación y aprovisionamiento de usuarios)

## Responsabilidad

Capa transversal de autenticación. Verifica los JWT emitidos por Supabase Auth y aprovisiona
automáticamente la fila local del usuario (`app_users`) en la primera petición autenticada.
Expone `JwtAuthGuard` y `CurrentUser` al resto de contextos; ningún otro módulo implementa
lógica de autenticación propia.

## Agregados y entidades

| Clase | Tipo | Descripción |
|---|---|---|
| `AuthenticatedUser` | Interfaz de valor | Usuario verificado disponible en `request.user` (id, email, displayName) |
| `VerifiedClaims` | Interfaz de valor | Claims del JWT tras verificación (sub, email) |

No hay aggregate root persistente propio: la tabla `app_users` se gestiona a través del
puerto `AppUserRepository`; la entidad resultante es `AuthenticatedUser`.

## Endpoints principales

| Verbo | Ruta | Descripción |
|---|---|---|
| GET | `/auth/me` | Usuario autenticado y sus familias (delegado en `FamilyModule`) |

> El `AuthController` vive en `FamilyModule` para evitar la dependencia cíclica
> `identity-access → family` (ver decisiones locales).

## Casos de uso

### `AuthenticateRequestUseCase`
Verifica el Bearer token de una petición y aprovisiona el usuario local en la primera llamada.
- **Endpoint**: Interno — no expone endpoint propio. Es invocado por `JwtAuthGuard` en cada petición protegida.
- **Entrada**: `token` string — el valor del header `Authorization: Bearer <token>`.
- **Salida**: `AuthenticatedUser` (id, email, displayName) que queda adjunto en `request.user`.
- **Reglas/invariantes**: el token debe ser un JWT firmado con ES256 y validar contra el JWKS de Supabase (issuer + audience configurados por variables de entorno). El `displayName` se fija al prefijo del email solo si el usuario no tenía uno previo (upsert con `COALESCE`).
- **Errores**: `InvalidTokenError` → 401 (token ausente, malformado, caducado o con firma incorrecta).

---

## Puertos y adaptadores

| Puerto | Implementación | Rol |
|---|---|---|
| `TokenVerifier` | `JoseTokenVerifier` | Verifica JWT ES256 contra el JWKS remoto de Supabase usando `jose` |
| `AppUserRepository` | `DrizzleAppUserRepository` | Upsert y consulta de `app_users` en PostgreSQL |

## Infraestructura exportada al resto de contextos

Este módulo exporta dos artefactos que usan todos los demás contextos:

| Artefacto | Tipo | Descripción |
|---|---|---|
| `JwtAuthGuard` | Guard de NestJS | Extrae el Bearer token, invoca `AuthenticateRequestUseCase` y adjunta `request.user`. Responde 401 si falta el token o no es válido. |
| `CurrentUser` | Decorador de parámetro | Inyecta el `AuthenticatedUser` de `request.user` en un parámetro de método del controller. Lanza un error si se usa sin `JwtAuthGuard`. |

Patrón de uso habitual en los demás controllers:

```typescript
@UseGuards(JwtAuthGuard, FamilyScopeGuard)
async miEndpoint(@CurrentUser() user: AuthenticatedUser): Promise<...>
```

## Decisiones locales

- Aprovisionamiento JIT de `app_users`: no hay endpoint de registro. La primera petición
  autenticada de un usuario de Supabase crea automáticamente su fila local. Ver ADR-0004.
- El `AuthController` (`GET /auth/me`) se registra en `FamilyModule` en lugar de en
  `IdentityAccessModule`. Esto rompe el ciclo de dependencia que se generaría si
  `identity-access` importase `family` para obtener las familias del usuario.
- `JoseTokenVerifier` usa `createRemoteJWKSet` de `jose`, que cachea las claves públicas
  de Supabase y las refresca automáticamente ante un `kid` desconocido. La API NUNCA
  conoce la clave privada de firma.
- Las variables de entorno necesarias son `JWT_JWKS_URL`, `JWT_ISSUER` y `JWT_AUDIENCE`.
  Si alguna falta, el módulo lanza un error al arrancar.
- `IdentityAccessModule` exporta `JwtAuthGuard` y `AuthenticateRequestUseCase`; es importado
  globalmente por `AppModule` para que todos los contextos puedan usar el guard.
