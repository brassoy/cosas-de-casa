/**
 * Configuración del overlay festivo al añadir un ítem.
 *
 * ── Frases ────────────────────────────────────────────────────────────────────
 * Edita `ONADD_PHRASES` para añadir, quitar o cambiar los mensajes.
 * Se selecciona uno aleatorio cada vez que el usuario añade un artículo.
 * Idioma: español de España (tuteo peninsular).
 *
 * ── GIFs ─────────────────────────────────────────────────────────────────────
 * Coloca los GIFs reales en `apps/web/public/gifs/` y añade sus rutas a
 * `ONADD_GIFS`. Las rutas son relativas a la raíz del servidor (e.g. /gifs/fiesta.gif).
 *
 * Mientras no haya GIFs reales, el array contiene marcadores de posición que
 * el componente interpreta como "sin GIF → solo emoji CSS".
 */

// ── Frases ────────────────────────────────────────────────────────────────────

export const ONADD_PHRASES: string[] = [
  '¡A la saca! Un paso más cerca de llenar la nevera.',
  'Apuntado. Tu yo del futuro en el súper te lo agradece.',
  'Hecho. Tranquila, que de acordarme me encargo yo.',
  '¡Otro más! Eres una máquina de organizar.',
  'Guardado. La lista crece, el estrés decrece.',
  '¡Toma! A este ritmo montas un supermercado.',
  'Anotado al vuelo. Nada se te escapa.',
  '¡Ya está! Un artículo menos que olvidar en la tienda.',
  'En la lista y en tu corazón. Bueno, en la lista seguro.',
  '¡Bravo! La nevera vacía tiene los días contados.',
];

// ── GIFs ──────────────────────────────────────────────────────────────────────
// Array vacío = sin GIFs todavía. El componente muestra solo la frase + emoji CSS.
// Cuando el usuario aporte GIFs, añade sus rutas aquí:
//   export const ONADD_GIFS: string[] = ['/gifs/fiesta.gif', '/gifs/baile.gif'];

export const ONADD_GIFS: string[] = [];

// ── Selección aleatoria ───────────────────────────────────────────────────────

/** Devuelve una frase aleatoria del array de frases. */
export function pickRandomPhrase(): string {
  const idx = Math.floor(Math.random() * ONADD_PHRASES.length);
  return ONADD_PHRASES[idx]!;
}

/** Devuelve una ruta de GIF aleatoria, o `null` si no hay GIFs configurados. */
export function pickRandomGif(): string | null {
  if (ONADD_GIFS.length === 0) return null;
  const idx = Math.floor(Math.random() * ONADD_GIFS.length);
  return ONADD_GIFS[idx]!;
}
