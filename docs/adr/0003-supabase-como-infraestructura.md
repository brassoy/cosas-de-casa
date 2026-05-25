# ADR-0003: Supabase como infraestructura detrás de puertos

**Fecha:** 2026-05-25
**Estado:** Aceptado

## Contexto y problema

Necesitamos base de datos (con búsqueda vectorial), autenticación (email + social), tiempo real
y almacenamiento de imágenes. Construirlo todo a mano es lento y multiplica la superficie de
seguridad. Pero tampoco queremos acoplar el dominio a un proveedor concreto.

## Opciones consideradas

1. **Todo autogestionado**: Postgres propio + auth propia (Better Auth/Lucia) + Socket.io + S3/MinIO.
   Máximo control, cero dependencia externa, mucho más trabajo y seguridad a nuestro cargo.
2. **Supabase como BaaS**: Postgres + pgvector, Auth, Realtime y Storage, detrás de nuestra API.

## Decisión

Supabase, **corriendo en local en desarrollo** (Supabase CLI + Docker, sin cuenta cloud), usado
como **adaptadores de infraestructura detrás de puertos**. El dominio nunca importa Supabase:
habla con interfaces (`AuthVerifier`, `RealtimePublisher`, `FileStorage`, repositorios) cuyas
implementaciones viven en `infrastructure/`.

## Consecuencias

**A favor**

- Aceleramos meses de trabajo (auth, realtime, storage, pgvector ya resueltos y endurecidos).
- En dev no hace falta cuenta ni coste: `pnpm db:start` levanta todo el stack en Docker.
- Como entra por puertos, podemos sustituir Supabase sin tocar el núcleo de negocio.

**En contra / trade-offs**

- Dependencia de un proveedor externo en producción (mitigada por la abstracción).
- Hay que mantener la disciplina de los puertos para que la dependencia no se filtre.

## Notas de implementación

- **Seguridad en profundidad**: aunque la API es la puerta, activamos **RLS** en Postgres por
  `family_id`. La API conecta con un rol que respeta RLS, no con `service_role`.
- Verificación de JWT contra el JWKS de Supabase (claves asimétricas ES256).
- Las credenciales del stack local las emite `supabase start`; las de producción irán en `.env`
  (fuera del control de versiones).
