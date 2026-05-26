# ADR-0009: Tareas — dependencia tasks→shopping y fotos por ruta de Storage

**Fecha:** 2026-05-26
**Estado:** Aceptado

## Contexto y problema

El contexto `tasks` necesita dos capacidades que tocan otros contextos:

1. **Generar una lista de la compra** a partir de una tarea (p.ej. "comprar materiales para
   pintar la habitación" → lista CUSTOM en `shopping`).
2. **Adjuntar fotos** a una tarea para documentar su estado (antes/después, instrucciones,
   etc.). La imagen puede pesar varios megabytes; guardarla en la base de datos no es viable.

## Opciones consideradas

### Fotos

1. **Subir la imagen al backend**, que la comprime y la almacena en Supabase Storage.
2. **El cliente sube directamente** a Supabase Storage con un presigned URL o la SDK de
   cliente, y el backend solo recibe y registra la `storagePath` resultante.

### Dependencia de listas

1. Duplicar la lógica de creación de listas dentro de `tasks`.
2. Llamar directamente al repositorio de `shopping` desde `tasks`.
3. Reutilizar `CreateCustomListUseCase` del contexto `shopping` desde `tasks`.

## Decisión

**Fotos**: el cliente comprime la imagen (calidad JPEG, dimensión máxima razonable) y la sube
directamente al bucket `task-photos` de Supabase Storage. Luego llama a
`POST /tasks/:taskId/photos` con el `storagePath`. El backend crea la entidad `TaskPhoto` con
esa ruta; la imagen nunca pasa por el proceso Node.

**Dependencia de listas**: `tasks` importa `CreateCustomListUseCase` de `shopping` directamente.
La dirección de la dependencia es `tasks → shopping` y no hay ciclo porque `shopping` no importa
`tasks`. El caso de uso `GenerateListFromTaskUseCase` delega en `CreateCustomListUseCase` con el
título de la tarea como nombre de la lista.

## Consecuencias

**A favor**

- Las imágenes no saturan la memoria del proceso Node ni el ancho de banda de la API.
- Supabase Storage aplica sus propias políticas RLS a los objetos del bucket.
- Reutilizar `CreateCustomListUseCase` evita duplicar lógica y mantiene un único punto de
  verdad para las invariantes de listas personalizadas.
- La dependencia `tasks → shopping` es unidireccional y explícita en el código.

**En contra / trade-offs**

- El cliente asume la responsabilidad de comprimir; si no lo hace, los objetos en Storage
  pueden ser grandes.
- La `storagePath` en la tabla `task_photos` puede quedar huérfana si el cliente sube la
  imagen pero no llama al endpoint de registro (no hay transacción distribuida).
- `tasks` queda acoplado a `shopping` en tiempo de compilación; un refactor de
  `CreateCustomListUseCase` impacta aquí. Acoplamiento aceptable en un monorepo con tipos
  compartidos.

## Notas de implementación

- `TaskPhoto` es una entidad inmutable: una vez creada, solo se puede eliminar.
- El repositorio `DrizzleTaskPhotoRepository` guarda `storagePath` como texto; la URL pública
  se construye en el presenter concatenando la base de Storage.
- El guard `TaskScopeGuard` verifica que la tarea pertenece a una familia a la que pertenece
  el usuario antes de permitir añadir o eliminar fotos.
