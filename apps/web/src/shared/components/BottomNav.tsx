import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Home } from 'lucide-react';
import { APP_MAX_WIDTH } from '@/shared/layout';

/**
 * Barra de navegación inferior (solo móvil).
 *
 * Accesos rápidos a las 4 secciones más usadas + un botón central (rombo) que
 * lleva al dashboard (home del hogar). Es "chrome" del shell, así que —igual que
 * AppHeader y NavDrawer— se estiliza con CSS vars semánticas y se adapta a los 4
 * themes sin necesidad de una celda por theme.
 *
 * La visibilidad (móvil + sesión + familia activa) la decide el shell (App.tsx);
 * este componente es presentacional y recibe el `familyId` ya resuelto.
 */

interface BottomNavItem {
  label: string;
  icon: string;
  /** Ruta resuelta (para resaltar la entrada activa). */
  path: string;
  /** Navega a la ruta (closure con el `to` literal para conservar el tipado). */
  go: () => void;
}

export function BottomNav({ familyId }: { familyId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const items: BottomNavItem[] = [
    {
      label: 'Compra',
      icon: '🛒',
      path: `/family/${familyId}/lists`,
      go: () => void navigate({ to: '/family/$familyId/lists', params: { familyId } }),
    },
    {
      label: 'Tareas',
      icon: '✅',
      path: `/family/${familyId}/tasks`,
      go: () => void navigate({ to: '/family/$familyId/tasks', params: { familyId } }),
    },
    {
      label: 'Planes',
      icon: '🗺️',
      path: '/plans',
      go: () => void navigate({ to: '/plans' }),
    },
    {
      label: 'Calendario',
      icon: '📅',
      path: `/family/${familyId}/calendar`,
      go: () => void navigate({ to: '/family/$familyId/calendar', params: { familyId } }),
    },
  ];

  const isActive = (item: BottomNavItem): boolean =>
    pathname === item.path || pathname.startsWith(`${item.path}/`);

  // Botón central → dashboard (home del hogar). Coincidencia EXACTA: el path del
  // dashboard (`/family/:id`) es prefijo de todas las rutas de familia, así que
  // usar startsWith lo marcaría activo en cada pantalla.
  const dashboardPath = `/family/${familyId}`;
  const dashboardActive = pathname === dashboardPath;
  const goDashboard = () =>
    void navigate({ to: '/family/$familyId', params: { familyId } });

  // 2 accesos | botón central | 2 accesos.
  const left = items.slice(0, 2);
  const right = items.slice(2);

  const renderItem = (item: BottomNavItem) => {
    const active = isActive(item);
    return (
      <button
        key={item.path}
        type="button"
        onClick={item.go}
        aria-current={active ? 'page' : undefined}
        aria-label={item.label}
        style={{ ...styles.item, ...(active ? styles.itemActive : null) }}
      >
        <span style={styles.icon} aria-hidden="true">
          {item.icon}
        </span>
        <span style={styles.label}>{item.label}</span>
      </button>
    );
  };

  return (
    <nav aria-label="Navegación rápida" style={styles.bar}>
      <div style={styles.inner}>
        {left.map(renderItem)}
        <div style={styles.centerSlot}>
          <button
            type="button"
            onClick={goDashboard}
            aria-current={dashboardActive ? 'page' : undefined}
            aria-label="Inicio"
            style={styles.centerButton}
          >
            <span
              aria-hidden="true"
              style={{ ...styles.diamond, ...(dashboardActive ? styles.diamondActive : null) }}
            />
            <span style={styles.centerIcon} aria-hidden="true">
              <Home size={22} strokeWidth={2.25} />
            </span>
          </button>
        </div>
        {right.map(renderItem)}
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    // Barra full-width (de borde a borde). Lienzo mode-aware (--app-canvas):
    // blanco en claro, oscuro en dark mode.
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: 'var(--app-canvas)',
    borderTop: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-lg, 0 -2px 10px rgba(0, 0, 0, 0.08))',
    // Respeta el "notch" inferior de iOS.
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  inner: {
    // Iconos centrados a APP_MAX_WIDTH: no se pegan a los extremos en desktop.
    maxWidth: APP_MAX_WIDTH,
    marginInline: 'auto',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'stretch',
  },
  item: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    padding: 'var(--space-2) 0',
    minHeight: '56px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-body)',
  },
  itemActive: {
    color: 'var(--color-accent)',
    fontWeight: 'var(--font-weight-semibold)',
  },
  icon: {
    fontSize: 'var(--font-size-xl)',
    lineHeight: 1,
  },
  label: {
    fontSize: 'var(--font-size-xs)',
    lineHeight: 1,
  },
  // --- Botón central (rombo, sobresale hacia arriba) ---
  centerSlot: {
    flex: 1,
    position: 'relative',
  },
  centerButton: {
    position: 'absolute',
    left: '50%',
    top: 0,
    transform: 'translate(-50%, -42%)',
    width: '52px',
    height: '52px',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
  diamond: {
    position: 'absolute',
    inset: 0,
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-accent)',
    // Cuadrado rotado 45° → rombo/diamante (como la tab bar de Hadara).
    transform: 'rotate(45deg)',
    boxShadow: 'var(--shadow-lg, 0 4px 12px rgba(0, 0, 0, 0.2))',
    transition: 'background-color 0.15s ease',
  },
  diamondActive: {
    backgroundColor: 'var(--color-accent-hover)',
  },
  centerIcon: {
    // El icono NO se rota (es hermano del rombo, no hijo).
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-inverse)',
  },
};
