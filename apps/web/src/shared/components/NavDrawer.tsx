import { useEffect, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useFamilyStore } from '@/features/family/store/family.store';

/**
 * Menú de navegación lateral (drawer).
 *
 * Se abre con el botón ☰ de la cabecera y permite saltar entre TODAS las
 * secciones desde cualquier pantalla, sin pasar por la pantalla de inicio.
 * Solo aparece cuando hay sesión y una familia activa (las secciones del hogar
 * dependen del `familyId`). Se cierra al pulsar fuera, con Escape o al navegar.
 */

interface NavEntry {
  label: string;
  /** Ruta resuelta (para resaltar la entrada activa). */
  path: string;
  /** Navega a la ruta (closure con el `to` literal para conservar el tipado). */
  go: () => void;
  /** Si es true, solo se marca activa con coincidencia exacta de ruta. */
  exact?: boolean;
}

export function NavDrawer() {
  const session = useAuthStore((s) => s.session);
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Cerrar con Escape mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!session || !activeFamily) return null;
  const familyId = activeFamily.id;

  const hogar: NavEntry[] = [
    {
      label: '🏠 Inicio',
      path: `/family/${familyId}`,
      exact: true,
      go: () => void navigate({ to: '/family/$familyId', params: { familyId } }),
    },
    {
      label: '🛒 Listas de la compra',
      path: `/family/${familyId}/lists`,
      go: () => void navigate({ to: '/family/$familyId/lists', params: { familyId } }),
    },
    {
      label: '✅ Tareas',
      path: `/family/${familyId}/tasks`,
      go: () => void navigate({ to: '/family/$familyId/tasks', params: { familyId } }),
    },
    {
      label: '🧊 Nevera',
      path: `/family/${familyId}/fridge`,
      go: () => void navigate({ to: '/family/$familyId/fridge', params: { familyId } }),
    },
    {
      label: '📅 Calendario',
      path: `/family/${familyId}/calendar`,
      go: () => void navigate({ to: '/family/$familyId/calendar', params: { familyId } }),
    },
    {
      label: '📊 Estadísticas',
      path: `/family/${familyId}/stats`,
      go: () => void navigate({ to: '/family/$familyId/stats', params: { familyId } }),
    },
    {
      label: '💕 Rincón',
      path: `/family/${familyId}/romantic`,
      go: () => void navigate({ to: '/family/$familyId/romantic', params: { familyId } }),
    },
    {
      label: '🧾 Tickets y gasto',
      path: `/family/${familyId}/budget`,
      go: () => void navigate({ to: '/family/$familyId/budget', params: { familyId } }),
    },
    {
      label: '🍳 Menú de la nevera',
      path: `/family/${familyId}/menu`,
      go: () => void navigate({ to: '/family/$familyId/menu', params: { familyId } }),
    },
  ];

  const social: NavEntry[] = [
    { label: '🎉 Peñas', path: '/groups', go: () => void navigate({ to: '/groups' }) },
    { label: '🗺️ Planes', path: '/plans', go: () => void navigate({ to: '/plans' }) },
    { label: '👯 Familias amigas', path: '/friends', go: () => void navigate({ to: '/friends' }) },
  ];

  const cuenta: NavEntry[] = [
    { label: '⚙️ Ajustes', path: '/settings', go: () => void navigate({ to: '/settings' }) },
    {
      label: '👨‍👩‍👧 Familia',
      path: `/family/${familyId}/manage`,
      go: () =>
        void navigate({ to: '/family/$familyId/manage', params: { familyId } }),
    },
  ];

  const isActive = (entry: NavEntry): boolean =>
    entry.exact
      ? pathname === entry.path
      : pathname === entry.path || pathname.startsWith(`${entry.path}/`);

  function renderGroup(title: string, entries: NavEntry[]) {
    return (
      <div style={styles.group}>
        <p style={styles.groupTitle}>{title}</p>
        {entries.map((entry) => {
          const active = isActive(entry);
          return (
            <button
              key={entry.path}
              type="button"
              onClick={() => {
                entry.go();
                setOpen(false);
              }}
              aria-current={active ? 'page' : undefined}
              style={{
                ...styles.item,
                ...(active ? styles.itemActive : null),
              }}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menú de navegación"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(true)}
        style={styles.hamburger}
      >
        ☰
      </button>

      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        style={{
          ...styles.backdrop,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />

      <nav
        aria-label="Navegación principal"
        aria-hidden={!open}
        style={{
          ...styles.panel,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <p style={styles.panelTitle}>{activeFamily.name}</p>
        {renderGroup('Hogar', hogar)}
        {renderGroup('Social', social)}
        {renderGroup('Cuenta', cuenta)}
      </nav>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hamburger: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    cursor: 'pointer',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-lg)',
    lineHeight: 1,
    fontFamily: 'var(--font-body)',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 200,
    transition: 'opacity 0.2s ease',
  },
  panel: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100dvh',
    width: 'min(80vw, 280px)',
    backgroundColor: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-lg, 0 10px 30px rgba(0,0,0,0.2))',
    zIndex: 201,
    transition: 'transform 0.22s ease',
    overflowY: 'auto',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  panelTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-heading)',
    margin: 0,
    padding: 'var(--space-2) var(--space-3)',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  groupTitle: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 var(--space-1)',
    padding: '0 var(--space-3)',
  },
  item: {
    background: 'none',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    textAlign: 'left',
    cursor: 'pointer',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    fontFamily: 'var(--font-body)',
    width: '100%',
  },
  itemActive: {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-accent-contrast, #fff)',
    fontWeight: 'var(--font-weight-semibold)',
  },
};
