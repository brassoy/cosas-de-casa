import { type FormEvent, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateFamily } from '../hooks/useFamily';
import { ApiRequestError } from '@/shared/lib/api';

export function CreateFamilyPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateFamily();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre de la unidad familiar es obligatorio.');
      return;
    }

    mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: async (family) => {
          await navigate({ to: '/family/$familyId', params: { familyId: family.id } });
        },
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido crear la unidad familiar. Inténtalo de nuevo.';
          setError(msg);
        },
      },
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Crea tu unidad familiar</h2>
        <p style={styles.subtitle}>
          Da un nombre a tu hogar y empieza a gestionar todo lo de casa juntos.
        </p>

        {error && (
          <p role="alert" style={styles.error}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <label htmlFor="family-name" style={styles.label}>
            Nombre <span aria-hidden="true">*</span>
          </label>
          <input
            id="family-name"
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. Casa García"
            style={styles.input}
            disabled={isPending}
          />

          <label htmlFor="family-desc" style={styles.label}>
            Descripción <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(opcional)</span>
          </label>
          <textarea
            id="family-desc"
            rows={3}
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Una descripción breve de tu hogar"
            style={{ ...styles.input, resize: 'vertical' }}
            disabled={isPending}
          />

          <button type="submit" style={styles.btnPrimary} disabled={isPending}>
            {isPending ? 'Creando...' : 'Crear unidad familiar'}
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
    maxWidth: '480px',
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
  input: {
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    width: '100%',
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
