import { useEffect, useRef } from 'react';
import { useNotificationsStore } from '../store/notifications.store';
import { useSubscribeToPush } from '../hooks/useNotifications';

// ── Mensajes de estado ────────────────────────────────────────────────────────

const STATUS_COPY = {
  unsupported: {
    label: 'Notificaciones no disponibles',
    description: 'Tu navegador no es compatible con las notificaciones push.',
    disabled: true,
  },
  denied: {
    label: 'Notificaciones bloqueadas',
    description:
      'Has bloqueado los permisos. Para activarlas, ve a Ajustes del navegador → Privacidad → Notificaciones.',
    disabled: true,
  },
  granted: {
    label: 'Notificaciones activadas',
    description: 'Recibirás alertas de tareas, caducidades y novedades del hogar.',
    disabled: false,
  },
  default: {
    label: 'Activar notificaciones',
    description: 'Recibe avisos de tareas, fechas de caducidad y más.',
    disabled: false,
  },
} as const;

// ── Componente ────────────────────────────────────────────────────────────────

export function NotificationToggle() {
  const { permissionStatus, isSubscribed, isLoading, setPermissionStatus } =
    useNotificationsStore();
  const subscribe = useSubscribeToPush();

  // Sincronizar el estado real del permiso cuando el componente monta.
  // Sólo lo hacemos una vez (ref de centinela) y únicamente si el store
  // tiene un valor de "default" (para no pisarlo en tests o si ya está en
  // "granted"/"denied" por un ciclo anterior).
  const syncedRef = useRef(false);
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    if ('Notification' in window && permissionStatus === 'default') {
      const real = Notification.permission;
      if (real !== 'default') {
        setPermissionStatus(real as 'granted' | 'denied');
      }
    }
  }, [permissionStatus, setPermissionStatus]);

  const config = STATUS_COPY[permissionStatus];
  const isActive = permissionStatus === 'granted' && isSubscribed;
  const showSpinner = isLoading || subscribe.isPending;

  function handleClick() {
    if (config.disabled || isActive) return;
    subscribe.mutate();
  }

  return (
    <div style={styles.wrapper} aria-label="Gestión de notificaciones push">
      <div style={styles.info}>
        <span style={styles.icon} aria-hidden="true">
          {isActive ? '🔔' : permissionStatus === 'denied' ? '🔕' : '🔔'}
        </span>
        <div>
          <p style={styles.label}>{config.label}</p>
          <p style={styles.description}>
            {subscribe.error ? subscribe.error.message : config.description}
          </p>
        </div>
      </div>

      {!isActive && (
        <button
          type="button"
          onClick={handleClick}
          disabled={config.disabled || showSpinner}
          aria-label={config.label}
          style={{
            ...styles.btn,
            ...(config.disabled || isActive ? styles.btnDisabled : styles.btnPrimary),
          }}
        >
          {showSpinner ? (
            <span aria-live="polite">Activando...</span>
          ) : permissionStatus === 'denied' ? (
            'Ver ajustes'
          ) : (
            'Activar'
          )}
        </button>
      )}

      {isActive && (
        <span style={styles.badge} aria-live="polite">
          ✓ Activas
        </span>
      )}
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-4)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
  },
  info: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    flex: 1,
    minWidth: 0,
  },
  icon: {
    fontSize: '1.5rem',
    flexShrink: 0,
    lineHeight: 1,
    marginTop: '2px',
  },
  label: {
    fontWeight: 'var(--font-weight-semibold)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text)',
    marginBottom: 'var(--space-1)',
  },
  description: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    lineHeight: 'var(--line-height-relaxed)',
  },
  btn: {
    flexShrink: 0,
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnPrimary: {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
  },
  btnDisabled: {
    backgroundColor: 'var(--color-surface-overlay)',
    color: 'var(--color-text-muted)',
    cursor: 'not-allowed',
  },
  badge: {
    flexShrink: 0,
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-accent-subtle)',
    color: 'var(--color-accent)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
  },
};
