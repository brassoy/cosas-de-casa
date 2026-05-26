import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useRedeemFriendInvite } from '../hooks/useFriends';
import { ApiRequestError } from '@/shared/lib/api';

export function RedeemFriendPage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const redeemInvite = useRedeemFriendInvite();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = code.trim();
    if (!trimmed) {
      setErrorMsg('Introduce el código de invitación.');
      return;
    }

    redeemInvite.mutate(
      { code: trimmed, familyId: activeFamily?.id ?? '' },
      {
        onSuccess: () => {
          void navigate({
            to: '/friends',
            search: {},
          });
        },
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido canjear el código. Inténtalo de nuevo.';
          setErrorMsg(msg);
        },
      },
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <button
          type="button"
          onClick={() => void navigate({ to: '/friends' })}
          style={styles.backBtn}
          aria-label="Volver a familias amigas"
        >
          ← Familias amigas
        </button>
        <h2 style={styles.heading}>Canjear código de amistad</h2>
      </header>

      <p style={styles.description}>
        Introduce el código que te ha compartido otra familia para conectaros en{' '}
        <strong>{activeFamily?.name ?? 'tu familia'}</strong>.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label htmlFor="friend-code" style={styles.label}>
          Código de invitación
        </label>
        <input
          id="friend-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="p. ej. ABC123XY"
          style={styles.input}
          autoComplete="off"
          autoFocus
        />

        {errorMsg && (
          <p role="alert" style={styles.error}>
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          style={styles.btnPrimary}
          disabled={redeemInvite.isPending}
        >
          {redeemInvite.isPending ? 'Canjeando...' : 'Canjear código'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
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
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  description: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  input: {
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.1em',
    outline: 'none',
  },
  btnPrimary: {
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
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
