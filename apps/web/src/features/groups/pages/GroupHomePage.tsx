import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { GroupMemberDto } from '../contracts';
import { useGroupMembers, useGenerateGroupPin, useLeaveGroup } from '../hooks/useGroups';
import { useGroupsStore } from '../store/groups.store';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ApiRequestError } from '@/shared/lib/api';

function buildShareText(pin: string): string {
  return `¡Únete a mi peña en Cosas de Casa! Usa el PIN: ${pin}`;
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

function MemberRow({ member }: { member: GroupMemberDto }) {
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

export function GroupHomePage() {
  const navigate = useNavigate();
  const { groupId } = useParams({ from: '/groups/$groupId' });
  const activeGroup = useGroupsStore((s) => s.activeGroup);
  const user = useAuthStore((s) => s.user);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const { data: members, isLoading, error } = useGroupMembers(groupId);
  const generatePin = useGenerateGroupPin(groupId);
  const leaveGroup = useLeaveGroup(groupId);

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

  function handleLeave() {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    setLeaveError(null);
    leaveGroup.mutate(undefined, {
      onSuccess: async () => {
        await navigate({ to: '/groups' });
      },
      onError: (err) => {
        setConfirmLeave(false);
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido salir de la peña. Inténtalo de nuevo.';
        setLeaveError(msg);
      },
    });
  }

  const groupName = activeGroup?.name ?? 'Peña';

  if (!groupId) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>Peña no encontrada.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <button
          type="button"
          onClick={() => void navigate({ to: '/groups' })}
          style={styles.backBtn}
          aria-label="Volver a mis peñas"
        >
          ← Mis peñas
        </button>
        <h2 style={styles.groupName}>{groupName}</h2>
      </header>

      {/* Miembros */}
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

      {/* Invitar (solo OWNER) */}
      {isOwner && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Invitar miembros</h3>
          <button
            type="button"
            onClick={handleGeneratePin}
            style={styles.btnPrimary}
            disabled={generatePin.isPending}
          >
            {generatePin.isPending ? 'Generando...' : 'Generar PIN'}
          </button>
          {pinError && (
            <p role="alert" style={styles.error}>
              {pinError}
            </p>
          )}
          {generatedPin && <PinShare pin={generatedPin} />}
        </section>
      )}

      {/* Salir de la peña */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Salir de la peña</h3>
        {leaveError && (
          <p role="alert" style={styles.error}>
            {leaveError}
          </p>
        )}
        {confirmLeave ? (
          <div style={styles.confirmRow}>
            <p style={styles.muted}>¿Seguro que quieres salir de esta peña?</p>
            <div style={styles.confirmActions}>
              <button
                type="button"
                onClick={handleLeave}
                style={styles.btnDanger}
                disabled={leaveGroup.isPending}
              >
                {leaveGroup.isPending ? 'Saliendo...' : 'Confirmar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmLeave(false)}
                style={styles.btnSecondary}
                disabled={leaveGroup.isPending}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={handleLeave} style={styles.btnDanger}>
            Salir de la peña
          </button>
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
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-accent)',
    fontSize: 'var(--font-size-sm)',
    padding: 0,
    textAlign: 'left',
  },
  groupName: {
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
  btnDanger: {
    alignSelf: 'flex-start',
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-error)',
    backgroundColor: 'transparent',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
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
  confirmRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  confirmActions: {
    display: 'flex',
    gap: 'var(--space-2)',
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
