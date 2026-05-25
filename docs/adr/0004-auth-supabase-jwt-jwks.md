# ADR-0004: Autenticación con Supabase Auth y verificación JWT por JWKS

**Fecha:** 2026-05-26
**Estado:** Aceptado

## Contexto y problema

Necesitamos registro/login con email+contraseña y login social, sin construir desde cero la
gestión de identidades (hash de contraseñas, flujos OAuth, recuperación...). Además, el backend
debe validar las peticiones sin acoplarse a un proveedor concreto.

## Opciones consideradas

1. Auth propia (Better Auth/Lucia) + tablas de credenciales.
2. **Supabase Auth** emitiendo JWT, verificados en el backend.

## Decisión

Supabase Auth emite **JWT asimétricos ES256**. El frontend usa `@supabase/supabase-js` con la
_publishable key_. El backend los verifica de forma **stateless** con `jose`
(`createRemoteJWKSet` contra `/auth/v1/.well-known/jwks.json`), validando `issuer` y `audience`.
La verificación vive detrás de un puerto `TokenVerifier` (adaptador `JoseTokenVerifier`), así el
dominio no sabe de Supabase. **Aprovisionamiento JIT**: en la primera petición autenticada se hace
_upsert_ de `app_users` desde los claims (`sub`, `email`).

## Consecuencias

**A favor**

- No gestionamos contraseñas ni el baile de OAuth; menos superficie de seguridad propia.
- Verificación con clave pública: sin llamadas de red por petición (JWKS cacheado), sin estado de sesión.
- Cambiar de proveedor solo toca el adaptador `JoseTokenVerifier`.

**En contra / trade-offs**

- Dependemos de Supabase Auth (mitigado por el puerto).
- **Gotcha**: `@supabase/supabase-js` v2 inicializa el módulo _realtime_ en el constructor y exige
  WebSocket nativo (Node ≥ 22); en Node 20 peta. Por eso en servidor/tests usamos `fetch`/`jose`,
  no el SDK; el _realtime_ vive solo en el navegador.

## Notas de implementación

`apps/api/src/contexts/identity-access/`. Google OAuth queda pendiente de credenciales (botón en la
UI ya cableado, se activa al añadir `GOOGLE_CLIENT_ID/SECRET`).
