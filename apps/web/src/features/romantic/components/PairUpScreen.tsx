/**
 * PairUpScreen — pantalla para emparejar al usuario con otro miembro de la familia.
 *
 * Se muestra cuando useCouple devuelve null (sin pareja todavía).
 */

import { useState } from 'react';
import type { FamilyMemberDto } from '@cosasdecasa/contracts';
import { useCreateCouple } from '../hooks/useRomantic';
import { ApiRequestError } from '@/shared/lib/api';

interface Props {
  familyId: string;
  /** userId del usuario actual (para excluirlo de la lista de candidatos). */
  currentUserId: string;
  members: FamilyMemberDto[];
}

export function PairUpScreen({ familyId, currentUserId, members }: Props) {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createCouple = useCreateCouple(familyId);

  const candidates = members.filter((m) => m.userId !== currentUserId);

  function handleSubmit() {
    if (!selectedPartnerId) return;
    setError(null);
    createCouple.mutate(
      { partnerUserId: selectedPartnerId },
      {
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido crear la pareja. Inténtalo de nuevo.';
          setError(msg);
        },
      },
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.hero}>
          <span style={styles.heroEmoji}>💕</span>
          <h1 style={styles.title}>¡Crea tu rincón de pareja!</h1>
          <p style={styles.subtitle}>
            Elige a tu persona especial dentro de la familia para compartir retos,
            notas y alguna que otra maldad cariñosa.
          </p>
        </div>

        {candidates.length === 0 ? (
          <p style={styles.empty}>
            No hay otros miembros en la familia todavía. Invita a alguien primero.
          </p>
        ) : (
          <>
            <p style={styles.label}>Elige a tu pareja:</p>
            <ul style={styles.memberList} role="listbox" aria-label="Miembros de la familia">
              {candidates.map((m) => {
                const isSelected = selectedPartnerId === m.userId;
                return (
                  <li
                    key={m.userId}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelectedPartnerId(m.userId)}
                    style={{
                      ...styles.memberItem,
                      ...(isSelected ? styles.memberItemSelected : {}),
                    }}
                  >
                    <div style={styles.avatar}>
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.displayName} style={styles.avatarImg} />
                      ) : (
                        <span style={styles.avatarFallback}>
                          {m.displayName[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span style={styles.memberName}>{m.displayName}</span>
                    {isSelected && <span style={styles.check} aria-hidden="true">✓</span>}
                  </li>
                );
              })}
            </ul>

            {error && (
              <p role="alert" style={styles.error}>
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedPartnerId || createCouple.isPending}
              style={{
                ...styles.btnPrimary,
                ...(!selectedPartnerId || createCouple.isPending ? styles.btnDisabled : {}),
              }}
            >
              {createCouple.isPending ? 'Creando vínculo…' : '💑 Emparejarme'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60dvh',
    padding: 'var(--space-6)',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-8)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-3)',
    textAlign: 'center',
  },
  heroEmoji: {
    fontSize: '3rem',
  },
  title: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  subtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    lineHeight: '1.5',
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  empty: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    padding: 'var(--space-4)',
  },
  memberList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  memberItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '2px solid var(--color-border)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    backgroundColor: 'var(--color-surface)',
  },
  memberItemSelected: {
    borderColor: 'var(--color-accent)',
    backgroundColor: 'var(--color-accent-subtle)',
  },
  avatar: {
    width: '36px',
    height: '36px',
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
    fontSize: 'var(--font-size-base)',
  },
  memberName: {
    flex: 1,
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
  },
  check: {
    color: 'var(--color-accent)',
    fontWeight: 'var(--font-weight-bold)',
    fontSize: 'var(--font-size-lg)',
  },
  error: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
  btnPrimary: {
    padding: 'var(--space-3) var(--space-6)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
    width: '100%',
    transition: 'all var(--transition-fast)',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
