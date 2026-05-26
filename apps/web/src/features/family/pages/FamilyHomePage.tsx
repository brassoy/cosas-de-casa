import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { FamilyMemberDto } from '@cosasdecasa/contracts';
import { useFamilyMembers, useGenerateJoinPin } from '../hooks/useFamily';
import { useFamilyStore } from '../store/family.store';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ApiRequestError } from '@/shared/lib/api';
import { NotificationToggle } from '@/features/notifications/components/NotificationToggle';

function buildShareText(pin: string): string {
  return `¡Únete a mi familia en Cosas de Casa! Usa el PIN: ${pin}`;
}

function PinShare({ pin }: { pin: string }) {
  const [copied, setCopied] = useState(false);
  const text = buildShareText(pin);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={styles.pinBox}>
      <p style={styles.pinLabel}>PIN generado</p>
      <div style={styles.pinRow}>
        <span style={styles.pinCode}>{pin}</span>
        <button type="button" onClick={handleCopy} style={styles.btnSecondary}>
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
      <div style={styles.shareRow}>
        <a href={waUrl} target="_blank" rel="noopener noreferrer" style={styles.shareLink}>
          Compartir por WhatsApp
        </a>
        <a href={tgUrl} target="_blank" rel="noopener noreferrer" style={styles.shareLink}>
          Compartir por Telegram
        </a>
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: FamilyMemberDto }) {
  return (
    <li style={styles.memberRow}>
      <div style={styles.avatar}>
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt={member.displayName} style={styles.avatarImg} />
        ) : (
          <span style={styles.avatarFallback}>{member.displayName[0]?.toUpperCase()}</span>
        )}
      </div>
      <div>
        <p style={styles.memberName}>{member.displayName}</p>
        <p style={styles.memberRole}>{member.role === 'OWNER' ? 'Propietario' : 'Miembro'}</p>
      </div>
    </li>
  );
}

export function FamilyHomePage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const user = useAuthStore((s) => s.user);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  const { data: members, isLoading, error } = useFamilyMembers(activeFamily?.id);
  const generatePin = useGenerateJoinPin(activeFamily?.id ?? '');

  const isOwner = members?.some((m) => m.userId === user?.id && m.role === 'OWNER') ?? false;

  function handleGeneratePin() {
    setPinError(null);
    generatePin.mutate(undefined, {
      onSuccess: (res) => setGeneratedPin(res.code),
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido generar el PIN.';
        setPinError(msg);
      },
    });
  }

  if (!activeFamily) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <h2 style={styles.familyName}>{activeFamily.name}</h2>
      </header>

      {/* Accesos rápidos */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Accesos rápidos</h3>
        <div style={styles.quickLinks}>
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: '/family/$familyId/lists',
                params: { familyId: activeFamily.id },
              })
            }
            style={styles.quickLinkCard}
          >
            <span style={styles.quickLinkIcon}>🛒</span>
            <span style={styles.quickLinkLabel}>Listas de la compra</span>
          </button>
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: '/family/$familyId/tasks',
                params: { familyId: activeFamily.id },
              })
            }
            style={styles.quickLinkCard}
          >
            <span style={styles.quickLinkIcon}>✅</span>
            <span style={styles.quickLinkLabel}>Tareas</span>
          </button>
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: '/family/$familyId/fridge',
                params: { familyId: activeFamily.id },
              })
            }
            style={styles.quickLinkCard}
          >
            <span style={styles.quickLinkIcon}>🧊</span>
            <span style={styles.quickLinkLabel}>Nevera</span>
          </button>
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: '/family/$familyId/stats',
                params: { familyId: activeFamily.id },
              })
            }
            style={styles.quickLinkCard}
          >
            <span style={styles.quickLinkIcon}>📊</span>
            <span style={styles.quickLinkLabel}>Estadísticas</span>
          </button>
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: '/family/$familyId/calendar',
                params: { familyId: activeFamily.id },
              })
            }
            style={styles.quickLinkCard}
          >
            <span style={styles.quickLinkIcon}>📅</span>
            <span style={styles.quickLinkLabel}>Calendario</span>
          </button>
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: '/family/$familyId/romantic',
                params: { familyId: activeFamily.id },
              })
            }
            style={styles.quickLinkCard}
          >
            <span style={styles.quickLinkIcon}>💕</span>
            <span style={styles.quickLinkLabel}>Rincón</span>
          </button>
          <button
            type="button"
            onClick={() => void navigate({ to: '/groups' })}
            style={styles.quickLinkCard}
          >
            <span style={styles.quickLinkIcon}>🎉</span>
            <span style={styles.quickLinkLabel}>Peñas</span>
          </button>
          <button
            type="button"
            onClick={() => void navigate({ to: '/plans' })}
            style={styles.quickLinkCard}
          >
            <span style={styles.quickLinkIcon}>🗺️</span>
            <span style={styles.quickLinkLabel}>Planes</span>
          </button>
          <button
            type="button"
            onClick={() => void navigate({ to: '/friends' })}
            style={styles.quickLinkCard}
          >
            <span style={styles.quickLinkIcon}>👯</span>
            <span style={styles.quickLinkLabel}>Familias amigas</span>
          </button>
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: '/family/$familyId/budget',
                params: { familyId: activeFamily.id },
              })
            }
            style={styles.quickLinkCard}
          >
            <span style={styles.quickLinkIcon}>🧾</span>
            <span style={styles.quickLinkLabel}>Tickets y gasto</span>
          </button>
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: '/family/$familyId/menu',
                params: { familyId: activeFamily.id },
              })
            }
            style={styles.quickLinkCard}
          >
            <span style={styles.quickLinkIcon}>🍳</span>
            <span style={styles.quickLinkLabel}>Menú de la nevera</span>
          </button>
        </div>
      </section>

      {/* Notificaciones */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Notificaciones</h3>
        <NotificationToggle />
      </section>

      {isOwner && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Invitar miembros</h3>
          <button
            type="button"
            onClick={handleGeneratePin}
            style={styles.btnPrimary}
            disabled={generatePin.isPending}
          >
            {generatePin.isPending ? 'Generando...' : 'Genera un PIN'}
          </button>
          {pinError && (
            <p role="alert" style={styles.error}>
              {pinError}
            </p>
          )}
          {generatedPin && <PinShare pin={generatedPin} />}
        </section>
      )}

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>
          Miembros {members ? `(${members.length})` : ''}
        </h3>

        {isLoading && <p style={styles.muted}>Cargando miembros...</p>}
        {error && (
          <p role="alert" style={styles.error}>
            No se han podido cargar los miembros.
          </p>
        )}
        {members && (
          <ul style={styles.memberList}>
            {members.map((m) => (
              <MemberRow key={m.userId} member={m} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-8)',
  },
  pageHeader: {
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-4)',
  },
  familyName: {
    fontSize: 'var(--font-size-3xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  btnPrimary: {
    alignSelf: 'flex-start',
    padding: 'var(--space-2) var(--space-6)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
  pinBox: {
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  pinLabel: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  pinRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  pinCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    letterSpacing: '0.2em',
    color: 'var(--color-text)',
  },
  shareRow: {
    display: 'flex',
    gap: 'var(--space-4)',
  },
  shareLink: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-accent)',
    textDecoration: 'underline',
  },
  memberList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3)',
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    backgroundColor: 'var(--color-accent-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarFallback: {
    color: 'var(--color-accent)',
    fontWeight: 'var(--font-weight-bold)',
    fontSize: 'var(--font-size-lg)',
  },
  memberName: {
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
  },
  memberRole: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
  quickLinks: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-3)',
  },
  quickLinkCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-5)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    backgroundColor: 'var(--color-surface-raised)',
    cursor: 'pointer',
    textAlign: 'center',
    background: 'none',
  },
  quickLinkIcon: {
    fontSize: '1.75rem',
  },
  quickLinkLabel: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  muted: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  error: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
};
