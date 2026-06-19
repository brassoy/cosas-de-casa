/**
 * Ancho máximo del contenido centrado de la app.
 *
 * El shell (App), la cabecera (AppHeader) y la barra inferior (BottomNav) usan
 * este valor: las barras ocupan TODO el ancho de la pantalla, pero su contenido
 * se centra a este tope para no pegarse a los extremos en pantallas anchas. El
 * contenido principal hace lo mismo: es responsive y se adapta, pero no se
 * estira más allá de este máximo.
 */
export const APP_MAX_WIDTH = '42rem'; // 672px
