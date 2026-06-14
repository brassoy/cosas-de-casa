/* ─── useThemeName — Cosas de Casa ──────────────────────────────────────────
 *
 * Hook reactivo que lee `data-theme` de <html>. Vive en su propio archivo (no
 * junto al componente ThemeView) para no romper Fast Refresh: react-refresh
 * exige que un módulo que exporta componentes no exporte además hooks/funciones.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { getTheme } from './theme-bootstrap';
import type { ThemeName } from './theme-bootstrap';

/**
 * Lee `data-theme` de <html> de forma reactiva. Cuando el usuario cambia de theme
 * (vía ThemeSelector → applyTheme), el atributo cambia y este hook re-renderiza a
 * todos los consumidores mediante un MutationObserver sobre el atributo.
 */
export function useThemeName(): ThemeName {
  const [theme, setThemeState] = useState<ThemeName>(() => getTheme().theme);

  useEffect(() => {
    const html = document.documentElement;

    const sync = () => {
      const next = getTheme().theme;
      setThemeState((prev) => (prev === next ? prev : next));
    };

    // Estado inicial por si cambió entre el render y el efecto.
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, []);

  return theme;
}
