import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import {
  useFriendFamilies,
  useGenerateFriendInvite,
  useRemoveFriend,
} from '../hooks/useFriends';
import type { FriendFamilyDto } from '../contracts';
import { ApiRequestError } from '@/shared/lib/api';

function buildShareText(code: string): string {
  return `¡Conecta tu familia con la mía en Cosas de Casa! Usa el código: ${code}`;
}

function InviteCodeShare({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const text = buildShareText(code);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={styles.codeBox}>
      <p style={styles.codeLabel}>Código de invitación</p>
      <div style={styles.codeRow}>
        <span style={styles.codeValue}>{code}</span>
        <button type="button" onClick={handleCopy} style={styles.btnSecondary}>
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
      <p style={styles.codeHint}>Comparte este código una sola vez. Caduca tras usarse.</p>
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

function FriendCard({
  friend,
  onRemove,
  removing,
}: {
  friend: FriendFamilyDto;
  onRemove: () => void;
  removing: boolean;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);

  function handleRemoveClick() {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    onRemove();
  }

  return (
    <li style={styles.friendCard}>
      <div style={styles.friendLeft}>
        <div style={styles.avatar}>
          {friend.familyImageUrl ? (
            <img src={friend.familyImageUrl} alt={friend.familyName} style={styles.avatarImg} />
          ) : (
            <span style={styles.avatarFallback}>{friend.familyName[0]?.toUpperCase()}</span>
          )}
        </div>
        <div>
          <p style={styles.friendName}>{friend.familyName}</p>
          <p style={styles.friendSince}>
            Amigas desde {new Date(friend.since).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
          </p>
        </div>
      </div>
      <div>
        {confirmRemove ? (
          <div style={styles.confirmRow}>
            <button
              type="button"
              onClick={handleRemoveClick}
              style={styles.btnDanger}
              disabled={removing}
            >
              {removing ? 'Quitando...' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              style={styles.btnSecondary}
              disabled={removing}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" onClick={handleRemoveClick} style={styles.btnDanger}>
            Quitar
          </button>
        )}
      </div>
    </li>
  );
}

export function FriendsPage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);

  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const { data: friends, isLoading, error } = useFriendFamilies(activeFamily?.id);
  const generateInvite = useGenerateFriendInvite(activeFamily?.id ?? '');
  const removeFriend = useRemoveFriend(activeFamily?.id);

  function handleGenerateInvite() {
    setInviteError(null);
    setGeneratedCode(null);
    generateInvite.mutate(undefined, {
      onSuccess: (res) => setGeneratedCode(res.code),
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido generar el código de invitación.';
        setInviteError(msg);
      },
    });
  }

  function handleRemove(linkId: string) {
    setRemoveError(null);
    removeFriend.mutate(linkId, {
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido quitar la amistad. Inténtalo de nuevo.';
        setRemoveError(msg);
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
        <button
          type="button"
          onClick={() =>
            void navigate({ to: '/family/$familyId', params: { familyId: activeFamily.id } })
          }
          style={styles.backBtn}
          aria-label="Volver al inicio"
        >
          ← Inicio
        </button>
        <h2 style={styles.heading}>Familias amigas</h2>
      </header>

      {/* Invitar */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Invitar una familia amiga</h3>
        <button
          type="button"
          onClick={handleGenerateInvite}
          style={styles.btnPrimary}
          disabled={generateInvite.isPending}
        >
          {generateInvite.isPending ? 'Generando...' : 'Generar código de invitación'}
        </button>
        {inviteError && (
          <p role="alert" style={styles.error}>
            {inviteError}
          </p>
        )}
        {generatedCode && <InviteCodeShare code={generatedCode} />}
      </section>

      {/* Canjear código */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>¿Tienes un código?</h3>
        <button
          type="button"
          onClick={() => void navigate({ to: '/friends/redeem' })}
          style={styles.btnSecondary}
        >
          Canjear código de amistad
        </button>
      </section>

      {/* Lista de familias amigas */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>
          Tus familias amigas {friends ? `(${friends.length})` : ''}
        </h3>

        {removeError && (
          <p role="alert" style={styles.error}>
            {removeError}
          </p>
        )}

        {isLoading && <p style={styles.muted}>Cargando familias amigas...</p>}

        {error && (
          <p role="alert" style={styles.error}>
            No se han podido cargar las familias amigas.
          </p>
        )}

        {friends && friends.length === 0 && !isLoading && (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>Aún no tienes familias amigas</p>
            <p style={styles.muted}>
              Genera un código de invitación y compártelo con otra familia.
            </p>
          </div>
        )}

        {friends && friends.length > 0 && (
          <ul style={styles.friendList}>
            {friends.map((f) => (
              <FriendCard
                key={f.linkId}
                friend={f}
                onRemove={() => handleRemove(f.linkId)}
                removing={removeFriend.isPending}
              />
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
  heading: {
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
    alignSelf: 'flex-start',
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
  },
  btnDanger: {
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-error)',
    backgroundColor: 'transparent',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
  },
  codeBox: {
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  codeLabel: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  codeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  codeValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    letterSpacing: '0.15em',
    color: 'var(--color-text)',
  },
  codeHint: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
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
  friendList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  friendCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-4)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
  },
  friendLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    minWidth: 0,
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
  friendName: {
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
  },
  friendSince: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
  confirmRow: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-12)',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
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
