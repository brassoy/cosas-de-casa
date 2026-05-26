# Servicios gated y degradación elegante: el patrón de IA

→ Decisión de referencia: ADR-0014 (IA gated, numeric, 503).

## El problema

Los servicios de IA son dependencias externas que fallan. Pueden fallar por falta de saldo,
por límite de tasa, por interrupción del proveedor o por mantenimiento. Si tu código no
maneja eso, el usuario ve un error genérico 500 y no sabe qué hacer.

La alternativa es diseñar el sistema para que funcione **sin IA** con alguna degradación
tolerable: el usuario puede completar la tarea manualmente.

## El patrón en este proyecto

### 1. El puerto define el contrato de error

Cada puerto de IA documenta explícitamente que DEBE lanzar un error específico cuando la
IA no está disponible:

```typescript
// menu/domain/ports/menu-suggestion.port.ts
/**
 * Si la IA no está disponible, DEBE lanzar MenuAiUnavailableError.
 */
export interface MenuSuggestionPort {
  suggest(fridgeItems: string[], dishCount: number): Promise<SuggestMenuResult>;
}
```

Esto es un contrato: cualquier adaptador que implemente el puerto está obligado a respetarlo.
Si mañana cambias de MiniMax a OpenAI, el nuevo adaptador debe lanzar el mismo error.

### 2. El adaptador captura y mapea

El adaptador real (`MinimaxMenuSuggestionAdapter`, `MinimaxReceiptOcrAdapter`) envuelve toda
la llamada al SDK en un `try/catch`. Detecta los errores de balance/auth/rate por palabras
clave en el mensaje y los convierte al error de dominio:

```typescript
} catch (err) {
  if (err instanceof MenuAiUnavailableError) throw err; // ya es el nuestro
  const message = (err as Error).message ?? '';
  if (message.includes('balance') || message.includes('quota') /* ... */) {
    throw new MenuAiUnavailableError('Sin crédito o límite de tasa alcanzado.');
  }
  throw new MenuAiUnavailableError(`Error de IA: ${message}`);
}
```

### 3. El filtro de errores convierte a HTTP 503

Cada contexto con IA tiene un filtro de excepciones NestJS que captura el error de dominio
y devuelve HTTP 503 con un mensaje legible:

```
HTTP 503 Service Unavailable
{ "message": "Servicio de IA no disponible. Puedes añadir los datos manualmente." }
```

**¿Por qué 503 y no 500?** Porque 503 significa "servicio temporalmente no disponible".
El cliente puede distinguir entre un error propio (500) y una dependencia externa caída (503)
y reaccionar de forma diferente (mostrar formulario manual, reintentar después).

### 4. El cliente degrada con gracia

El frontend muestra el formulario de alta manual cuando recibe 503 del endpoint de IA. El
usuario no ve un error; ve una alternativa. Eso es degradación elegante.

## Por qué no acoplar el dominio al proveedor

Si el caso de uso importase `MinimaxMenuSuggestionAdapter` directamente, cambiar de proveedor
requeriría modificar el caso de uso. Con el puerto en el medio, el caso de uso no sabe ni le
importa quién implementa la sugerencia de menú.

Esto también significa que en tests puedes inyectar un adaptador en memoria que devuelve
datos fijos, sin necesidad de llamar a ninguna API.

## El límite de tasa en la interfaz

Los endpoints de IA tienen un `RateLimitGuard` de 5 req/min aplicado en el controller
(capa de interfaz). Esto protege el coste antes de que la petición llegue al caso de uso.
El rate limiter es un cross-cutting concern de infraestructura; no pertenece al dominio.
