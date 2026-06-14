/* ─── Theme Bootstrap — Cosas de Casa ──────────────────────────────────────
 *
 * Modelo de theming: dos dimensiones ortogonales en <html>
 *   data-theme  → "base" | "cozy" | "cozysitcom" | "springfield"  (identidad visual)
 *   data-mode   → "light" | "dark"                                 (nivel de luminosidad)
 *
 * El CSS resuelve los tokens semánticos así:
 *   :root                  → tokens del theme base (light, por defecto)
 *   [data-mode='dark']     → variante oscura de los tokens (independiente del theme)
 *   [data-theme='cozy']    → tokens del theme cozy (light-only por ahora)
 *   …idem cozysitcom / springfield
 *
 * Los 3 themes alternativos son LIGHT-ONLY: bajo [data-theme='X'][data-mode='dark']
 * usan los MISMOS valores que en light (se definen en tokens.themes.css).
 *
 * El theme es una PREFERENCIA PERSONAL persistida en localStorage. No hay backend.
 * ─────────────────────────────────────────────────────────────────────────── */

export type ThemeName = 'base' | 'cozy' | 'cozysitcom' | 'springfield';
export type Mode = 'light' | 'dark';

export interface ThemePrefs {
  theme: ThemeName;
  mode: Mode;
}

const STORAGE_KEY = 'cosasdecasa:theme';
const DEFAULT_THEME: ThemeName = 'base';

const VALID_THEMES = ['base', 'cozy', 'cozysitcom', 'springfield'] as const;

function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (VALID_THEMES as readonly string[]).includes(value);
}

function isMode(value: unknown): value is Mode {
  return value === 'light' || value === 'dark';
}

// ── Lectura del sistema ──────────────────────────────────────────────────────

function getSystemMode(): Mode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ── Carga diferida de fuentes por theme ──────────────────────────────────────
//
// Las fuentes del theme base (Inter / JetBrains Mono) son globales y no se cargan
// aquí. Para los themes alternativos importamos dinámicamente los paquetes
// @fontsource correspondientes solo cuando el theme está activo, evitando penalizar
// el arranque. Es idempotente: cada familia se importa una única vez por sesión.

const loadedFonts = new Set<ThemeName>();

function ensureThemeFonts(theme: ThemeName): void {
  if (theme === 'base' || loadedFonts.has(theme)) return;
  loadedFonts.add(theme);

  switch (theme) {
    case 'cozy':
      // Caveat (500/700) + Patrick Hand (400)
      void import('@fontsource/caveat/500.css');
      void import('@fontsource/caveat/700.css');
      void import('@fontsource/patrick-hand/400.css');
      break;
    case 'cozysitcom':
      // Bree Serif (400) + Nunito (500/600/700/800)
      // 600 lo usa .cz-input (font-weight:600) en themes/cozysitcom.css.
      void import('@fontsource/bree-serif/400.css');
      void import('@fontsource/nunito/500.css');
      void import('@fontsource/nunito/600.css');
      void import('@fontsource/nunito/700.css');
      void import('@fontsource/nunito/800.css');
      break;
    case 'springfield':
      // Bangers (400) + Fredoka (700) + Nunito (500/700/900)
      void import('@fontsource/bangers/400.css');
      void import('@fontsource/fredoka/700.css');
      void import('@fontsource/nunito/500.css');
      void import('@fontsource/nunito/700.css');
      void import('@fontsource/nunito/900.css');
      break;
  }
}

// ── Persistencia ─────────────────────────────────────────────────────────────

function loadPrefs(): ThemePrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const candidate = parsed as Record<string, unknown>;
    const theme = candidate.theme;
    const mode = candidate.mode;

    // Migración suave: el formato viejo era { aesthetic, mode }. No tiene `theme`
    // válido, así que no valida y caemos a null → DEFAULT_THEME, sin crash.
    if (isThemeName(theme) && isMode(mode)) {
      return { theme, mode };
    }
  } catch {
    // localStorage no disponible o JSON inválido
  }
  return null;
}

function savePrefs(prefs: ThemePrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Fail silently
  }
}

// ── Aplicar al DOM ───────────────────────────────────────────────────────────

export function applyTheme(prefs?: Partial<ThemePrefs>): void {
  const saved = loadPrefs();
  const theme: ThemeName = prefs?.theme ?? saved?.theme ?? DEFAULT_THEME;
  const mode: Mode = prefs?.mode ?? saved?.mode ?? getSystemMode();

  const html = document.documentElement;
  html.setAttribute('data-theme', theme);
  html.setAttribute('data-mode', mode);

  ensureThemeFonts(theme);
}

// ── Setters públicos ─────────────────────────────────────────────────────────

export function setTheme(prefs: Partial<ThemePrefs>): void {
  const current = getTheme();
  const next: ThemePrefs = {
    theme: prefs.theme ?? current.theme,
    mode: prefs.mode ?? current.mode,
  };
  savePrefs(next);
  applyTheme(next);
}

export function setMode(mode: Mode): void {
  setTheme({ mode });
}

export function toggleMode(): void {
  const { mode } = getTheme();
  setMode(mode === 'dark' ? 'light' : 'dark');
}

// Alias de compatibilidad para el código existente que llama a toggleTheme()
export function toggleTheme(): void {
  toggleMode();
}

// ── Lectura del estado actual ────────────────────────────────────────────────

export function getTheme(): ThemePrefs {
  const html = document.documentElement;
  const theme = html.getAttribute('data-theme');
  const mode = html.getAttribute('data-mode');
  return {
    theme: isThemeName(theme) ? theme : DEFAULT_THEME,
    mode: isMode(mode) ? mode : getSystemMode(),
  };
}

// ── Reactividad: OS-level changes ────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Solo sincronizar si el usuario no tiene preferencia guardada
    if (loadPrefs()?.mode === undefined) {
      setMode(e.matches ? 'dark' : 'light');
    }
  });
}
