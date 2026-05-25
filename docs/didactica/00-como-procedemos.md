# Cómo procedemos

Este proyecto se construye con una regla por encima de todas: **entender antes de teclear**.
No escribimos una línea hasta tener claro el concepto y el porqué. La IA ejecuta; las
decisiones las dirigimos nosotros.

## El ciclo de cada incremento

1. **Diseño**: qué problema resuelve este _slice_ y cómo encaja en la arquitectura.
2. **Implementación en vertical**: dominio → infraestructura → interfaz → frontend.
3. **Pruebas en 3 anillos**:
   - _Unitarias_ (Vitest): la lógica de dominio aislada, sin I/O.
   - _Integración_ (Supertest + Supabase local): la API real contra una base de datos real.
   - _E2E_ (Playwright) + verificación manual sobre la app corriendo con el MCP de
     chrome-devtools (navegación, red, consola, Lighthouse, modo offline).
4. **Commit** solo si todo está verde. Conventional Commits y una unidad de trabajo coherente
   por commit (nunca "añade todos los modelos a la vez").
5. **Documentación**: cada decisión relevante deja un ADR en `adr/`.

## Por qué así

- **Faseado**: el alcance equivale a varias apps. Construirlo todo a la vez es el error nº 1.
  Empezamos por el núcleo (familia + listas) y el resto encastra encima.
- **Hexagonal**: el dominio no sabe de Nest ni de Supabase. Podemos cambiar la infraestructura
  sin tocar las reglas de negocio.
- **Offline-first**: la lista de la compra se usa en el súper, con mala señal. Si no funciona
  sin conexión, falla justo cuando más se necesita.
- **Seguridad por diseño**: autorización por familia + RLS en la base de datos, validación de
  entrada y secretos fuera del control de versiones. No es un añadido del final.

## Automatización

- **ralph-loop** para _slices_ con criterio verificable por máquina (build/tests verdes):
  itera construir → probar → corregir hasta cumplir el criterio.
- **Subagentes en paralelo** para trabajo independiente que no se pisa entre sí.
