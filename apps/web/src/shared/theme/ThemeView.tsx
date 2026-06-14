/* ─── ThemeView — Cosas de Casa ─────────────────────────────────────────────
 *
 * Resuelve y monta la vista presentacional activa para una pantalla, según el
 * theme actual leído del <html data-theme>. Si el theme activo no tiene la
 * pantalla convertida, cae a la vista `base` (fallback). Envuelve la vista en
 * <Suspense> para soportar code-split por theme (React.lazy en el registry).
 * ─────────────────────────────────────────────────────────────────────────── */

import { Suspense } from 'react';
import { themeRegistry } from './registry';
import type { ScreenId } from './registry';
import { Skeleton } from '@/shared/ui/skeleton';
import { useThemeName } from './use-theme-name';

function ScreenSkeleton() {
  return (
    <div style={{ padding: 'var(--space-6, 24px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-2/3" />
    </div>
  );
}

interface ThemeViewProps<P> {
  screen: ScreenId;
  props: P;
}

export function ThemeView<P>({ screen, props }: ThemeViewProps<P>) {
  const theme = useThemeName();
  const View = themeRegistry[theme][screen] ?? themeRegistry.base[screen];

  // base SIEMPRE debería existir una vez completada la Fase 2; hasta entonces,
  // si no hay vista registrada no renderizamos nada (no rompemos la app).
  if (!View) return null;

  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <View {...props} />
    </Suspense>
  );
}
