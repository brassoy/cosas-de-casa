import { type FormEvent, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useJoinGroup } from '../hooks/useGroups';
import { ApiRequestError } from '@/shared/lib/api';
import { GROUP_PIN_LENGTH, GROUP_PIN_REGEX } from '../contracts';

function friendlyJoinError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 404) return 'El PIN no existe. Comprueba que lo has introducido correctamente.';
    if (err.status === 410) return 'El PIN ha caducado. Pide al propietario que genere uno nuevo.';
    if (err.status === 409) return 'Este PIN ya ha sido usado. Solicita uno nuevo.';
    return err.body.message ?? 'No se ha podido unir a la peña. Inténtalo de nuevo.';
  }
  return 'Error inesperado. Inténtalo de nuevo.';
}

export function JoinGroupPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { mutate, isPending } = useJoinGroup();

  function handlePinChange(value: string) {
    setPin(value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, GROUP_PIN_LENGTH));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (pin.length !== GROUP_PIN_LENGTH) {
      setError(`El PIN debe tener ${GROUP_PIN_LENGTH} caracteres.`);
      return;
    }

    if (!GROUP_PIN_REGEX.test(pin)) {
      setError('El PIN contiene caracteres no válidos. Usa solo letras (sin I, L, O, U) y números.');
      return;
    }

    mutate(
      { code: pin },
      {
        onSuccess: async (res) => {
          await navigate({ to: '/groups/$groupId', params: { groupId: res.groupId } });
        },
        onError: (err) => {
          setError(friendlyJoinError(err));
        },
      },
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Únete con un PIN</h2>
        <p style={styles.subtitle}>
          Introduce el PIN de 8 caracteres que te ha compartido el propietario de la peña.
        </p>

        {error && (
          <p role="alert" style={styles.error}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <label htmlFor="join-pin" style={styles.label}>
            PIN de invitación
          </label>
          <input
            id="join-pin"
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            required
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            placeholder="XXXXXXXX"
            maxLength={GROUP_PIN_LENGTH}
            style={styles.pinInput}
            disabled={isPending}
            aria-describedby="pin-hint"
          />
          <p id="pin-hint" style={styles.hint}>
            {pin.length}/{GROUP_PIN_LENGTH} caracteres
          </p>

          <button
            type="submit"
            style={styles.btnPrimary}
            disabled={isPending || pin.length !== GROUP_PIN_LENGTH}
          >
            {isPending ? 'Uniéndose...' : 'Unirse a la peña'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80dvh',
    padding: 'var(--space-4)',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-8)',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--color-border)',
  },
  heading: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
    marginBottom: 'var(--space-2)',
  },
  subtitle: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    marginBottom: 'var(--space-6)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  pinInput: {
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-2xl)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.25em',
    textAlign: 'center',
    width: '100%',
  },
  hint: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    textAlign: 'right',
  },
  btnPrimary: {
    marginTop: 'var(--space-2)',
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
    marginBottom: 'var(--space-4)',
  },
};
