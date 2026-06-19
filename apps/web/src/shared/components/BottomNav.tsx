import { useNavigate, useRouterState } from '@tanstack/react-router';

/**
 * Barra de navegación inferior (solo móvil).
 *
 * Accesos rápidos a las 4 secciones más usadas. Es "chrome" del shell, así que
 * —igual que AppHeader y NavDrawer— se estiliza con CSS vars semánticas y se
 * adapta a los 4 themes sin necesidad de una celda por theme.
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

  return (
    <nav aria-label="Navegación rápida" style={styles.bar}>
      {items.map((item) => {
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
      })}
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'stretch',
    backgroundColor: 'var(--color-surface)',
    borderTop: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-lg, 0 -2px 10px rgba(0, 0, 0, 0.08))',
    // Respeta el "notch" inferior de iOS.
    paddingBottom: 'env(safe-area-inset-bottom)',
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
};
