/* ─── Theme Bootstrap — Cosas de Casa ──────────────────────────────────────
 *
 * Modelo de theming: dos dimensiones ortogonales en <html>
 *   data-aesthetic  → "pixel" | "ios" | "okuda"   (estética visual)
 *   data-mode       → "light" | "dark"             (nivel de luminosidad)
 *
 * El CSS lee [data-aesthetic='X'][data-mode='Y'] { --token: value }
 * ─────────────────────────────────────────────────────────────────────────── */

export type Aesthetic = 'pixel' | 'ios' | 'okuda';
export type Mode = 'light' | 'dark';

export interface ThemePrefs {
  aesthetic: Aesthetic;
  mode: Mode;
}

const STORAGE_KEY = 'cosasdecasa:theme';
const DEFAULT_AESTHETIC: Aesthetic = 'ios';

// ── Lectura del sistema ──────────────────────────────────────────────────────

function getSystemMode(): Mode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ── Persistencia ─────────────────────────────────────────────────────────────

function loadPrefs(): ThemePrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ThemePrefs>;
    const aesthetic = parsed.aesthetic;
    const mode = parsed.mode;
    if (
      (aesthetic === 'pixel' || aesthetic === 'ios' || aesthetic === 'okuda') &&
      (mode === 'light' || mode === 'dark')
    ) {
      return { aesthetic, mode };
    }
  } catch {
    // localStorage unavailable o JSON inválido
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
  const aesthetic: Aesthetic = prefs?.aesthetic ?? saved?.aesthetic ?? DEFAULT_AESTHETIC;
  const mode: Mode = prefs?.mode ?? saved?.mode ?? getSystemMode();

  const html = document.documentElement;
  html.setAttribute('data-aesthetic', aesthetic);
  html.setAttribute('data-mode', mode);
}

// ── Setters públicos ─────────────────────────────────────────────────────────

export function setTheme(prefs: Partial<ThemePrefs>): void {
  const current = getTheme();
  const next: ThemePrefs = {
    aesthetic: prefs.aesthetic ?? current.aesthetic,
    mode: prefs.mode ?? current.mode,
  };
  savePrefs(next);
  applyTheme(next);
}

export function setAesthetic(aesthetic: Aesthetic): void {
  setTheme({ aesthetic });
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
  const aesthetic = html.getAttribute('data-aesthetic') as Aesthetic | null;
  const mode = html.getAttribute('data-mode') as Mode | null;
  return {
    aesthetic: aesthetic ?? DEFAULT_AESTHETIC,
    mode: mode ?? getSystemMode(),
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
