/**
 * Frases peninsulares divertidas para el botón "hacer maldad".
 *
 * Se elige una aleatoria en cada llamada al caso de uso.
 */
export const MISCHIEF_PHRASES = [
  '¡Alerta! Tu pareja te está enviando mucho amor y no sabe cómo pararlo. 💞',
  'Parece que alguien piensa en ti ahora mismo… y tiene ganas de maldad. 😈',
  '¡Houston, tenemos un problema! Alguien te quiere demasiado. ❤️‍🔥',
  '¡Cuidado! Tu pareja está tramando algo muy peligroso: darte besitos. 😘',
  'Mensaje urgente de la persona que más te quiere: eres increíble. 🎉',
  '¡Te pillé pensando en mí! Tranquilo, yo también pienso en ti. 🥰',
] as const;

/** Devuelve una frase aleatoria del catálogo. */
export function randomMischiefPhrase(): string {
  const idx = Math.floor(Math.random() * MISCHIEF_PHRASES.length);
  return MISCHIEF_PHRASES[idx] ?? MISCHIEF_PHRASES[0];
}
