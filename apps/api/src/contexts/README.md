# Contextos de dominio (arquitectura hexagonal)

Cada subcarpeta de `contexts/` es un **bounded context** (p. ej. `family`, `shopping`).
La regla de dependencias apunta **hacia adentro**: `interface → application → domain ← infrastructure`.

```
contexts/<contexto>/
├─ domain/          # TS puro: entidades, agregados, value objects, eventos,
│                   #   PUERTOS (interfaces) y errores. Sin Nest, sin Supabase.
├─ application/     # casos de uso (un handler por comando/query) y puertos de
│                   #   servicios externos (clock, id, embeddings, event-bus...).
├─ infrastructure/  # adaptadores que IMPLEMENTAN los puertos (repos Drizzle,
│                   #   Supabase, clientes IA, mappers fila↔agregado).
└─ interface/       # controllers HTTP, DTOs + validación, guards y el
                    #   `*.module.ts` que liga cada puerto con su adaptador.
```

El **dominio nunca importa** framework ni infraestructura. Los adaptadores se
inyectan por DI en el `*.module.ts` del contexto. Así el núcleo de negocio es
testeable de forma aislada y podemos cambiar Supabase/Drizzle sin tocarlo.
