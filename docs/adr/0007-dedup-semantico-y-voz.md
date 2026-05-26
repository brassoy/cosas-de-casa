# ADR-0007: Dedup semántico, voz por IA y memoria de frecuencia

**Fecha:** 2026-05-26
**Estado:** Aceptado (con limitaciones documentadas)

## Contexto y problema

Al añadir a la lista hay que evitar duplicados y "casi-duplicados" ("leche" ≈ "caja de leche")
pero respetando variantes ("leche entera" ≠ "leche desnatada"). Además: añadir por voz
("añade patatas y judías") y recuperar lo que más se compra.

## Decisión

- **Normalización es-ES** (dominio puro): minúsculas/NFC, quita ruido de packaging (caja de, bote
  de, litro de…), singulariza, y CONSERVA modificadores con significado, de los que extrae
  **atributos** (p. ej. grasa: entera/semidesnatada/desnatada).
- **Embeddings + pgvector**: cada ítem del catálogo por familia tiene un `vector(384)`; búsqueda
  por coseno (índice HNSW), filtrada por `family_id`, en bandas de similitud.
- **DedupPolicy** combina ambas señales: similitud de nombre + **compatibilidad de atributos**.
  Atributos en conflicto de la misma clave → variantes distintas aunque el nombre coincida.
  Decisión: `ADD_NEW | AUTO_MERGE | SUGGEST`. Sin embedding disponible, cae a normalización pura.
- **Voz**: captura en cliente (Web Speech API, `es-ES`) → la frase va a la API → extracción con
  **MiniMax** (endpoint compatible-Anthropic, `tool_choice` forzado a una tool `extract_items`) →
  cada ítem pasa por el pipeline de dedup.
- **Frecuencia**: el catálogo por familia se _upserta_ al añadir (cuenta + `last_added_at`);
  endpoint de "más frecuentes".
- Todo detrás de **puertos** (`EmbeddingPort`, `ItemExtractionPort`, `CatalogItemRepository`).

## Consecuencias

**A favor**

- El dedup de los casos del enunciado funciona y **no depende de MiniMax** (los embeddings son locales).
- Los puertos permiten cambiar de modelo/proveedor sin tocar el dominio.

**En contra / limitaciones (documentadas)**

- `fastembed` 2.1 **no incluye `multilingual-e5`**; se usa **BGE-small-en (inglés, 384 dims)**. Los
  casos del usuario funcionan por la normalización es-ES + atributos, pero el matching _semántico_
  en español es flojo. **Mejora**: cambiar a `MLE5Large` (multilingüe, 1024 dims) y ajustar la
  columna a `vector(1024)`.
- **MiniMax requiere saldo**: sin saldo, la API responde `insufficient balance` y la extracción de
  voz cae a un parseo de texto plano (degradación elegante). Para la voz por IA real: recargar saldo
  (o conectar otro proveedor por el mismo puerto).

## Notas de implementación

`apps/api/src/contexts/ai/` (normalizer, dedup-policy, adaptadores fastembed/MiniMax, catálogo
Drizzle+pgvector). Migración `0002` (CREATE EXTENSION vector + `catalog_items`). El dedup y la
frecuencia se ejecutan al añadir un ítem (el controller orquesta shopping + ai).
