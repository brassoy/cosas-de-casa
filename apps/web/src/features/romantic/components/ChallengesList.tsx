/**
 * ChallengesList — lista de retos de pareja con marcar como hecho.
 *
 * Forma real del reto (CoupleChallengeDto):
 *   { id, coupleId, challengeKey, description, done, doneAt }
 *
 * Marcar hecho: POST /couples/:coupleId/challenges/done  body: { challengeKey }
 */

import { useChallenges, useMarkChallengeDone } from '../hooks/useRomantic';

interface Props {
  coupleId: string;
}

export function ChallengesList({ coupleId }: Props) {
  const { data: challenges, isLoading, error } = useChallenges(coupleId);
  const markDone = useMarkChallengeDone(coupleId);

  if (isLoading) {
    return <p style={styles.muted}>Cargando retos…</p>;
  }

  if (error) {
    return (
      <p role="alert" style={styles.errorBanner}>
        No se han podido cargar los retos.
      </p>
    );
  }

  if (!challenges || challenges.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyEmoji}>🎯</span>
        <p style={styles.emptyText}>
          Aún no hay retos. ¡El backend los generará pronto para vosotros!
        </p>
      </div>
    );
  }

  return (
    <ul style={styles.list} aria-label="Lista de retos de pareja">
      {challenges.map((challenge) => {
        const isPending =
          markDone.isPending &&
          markDone.variables?.challengeKey === challenge.challengeKey;

        return (
          <li key={challenge.id} style={styles.item}>
            <button
              type="button"
              aria-label={
                challenge.done
                  ? `Reto completado: "${challenge.challengeKey}"`
                  : `Marcar "${challenge.challengeKey}" como hecho`
              }
              aria-pressed={challenge.done}
              onClick={() => {
                if (!challenge.done) {
                  markDone.mutate({ challengeKey: challenge.challengeKey });
                }
              }}
              disabled={isPending || challenge.done}
              style={{
                ...styles.checkBtn,
                ...(challenge.done ? styles.checkBtnDone : {}),
                ...(isPending ? styles.checkBtnPending : {}),
              }}
            >
              {challenge.done ? '✓' : '○'}
            </button>

            <div style={styles.content}>
              <p
                style={{
                  ...styles.challengeKey,
                  ...(challenge.done ? styles.challengeKeyDone : {}),
                }}
              >
                {challenge.challengeKey}
              </p>
              {challenge.description && (
                <p style={styles.description}>{challenge.description}</p>
              )}
              {challenge.doneAt && (
                <time
                  dateTime={challenge.doneAt}
                  style={styles.doneAt}
                  title={new Date(challenge.doneAt).toLocaleString('es-ES')}
                >
                  Completado el{' '}
                  {new Date(challenge.doneAt).toLocaleDateString('es-ES')}
                </time>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    transition: 'opacity var(--transition-fast)',
  },
  checkBtn: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-full)',
    border: '2px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-base)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all var(--transition-fast)',
  },
  checkBtnDone: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    cursor: 'default',
  },
  checkBtnPending: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  challengeKey: {
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
  },
  challengeKeyDone: {
    textDecoration: 'line-through',
    color: 'var(--color-text-muted)',
  },
  description: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    lineHeight: '1.4',
  },
  doneAt: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  muted: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  errorBanner: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-8)',
    textAlign: 'center',
  },
  emptyEmoji: {
    fontSize: '2.5rem',
  },
  emptyText: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
};
