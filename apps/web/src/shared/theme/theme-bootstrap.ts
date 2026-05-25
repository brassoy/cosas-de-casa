type Theme = 'light' | 'dark';

const STORAGE_KEY = 'cosasdecasa:theme';

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage unavailable (private mode, SSR, etc.)
  }
  return null;
}

export function applyTheme(theme?: Theme): void {
  const resolved = theme ?? getStoredTheme() ?? getSystemTheme();
  document.documentElement.setAttribute('data-theme', resolved);
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Fail silently
  }
  applyTheme(theme);
}

export function toggleTheme(): void {
  const current = document.documentElement.getAttribute('data-theme') as Theme | null;
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// Listen for OS-level changes when no explicit preference is stored
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (getStoredTheme() === null) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}
