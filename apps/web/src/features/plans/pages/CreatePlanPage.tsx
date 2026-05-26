import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useCreatePlan, useSavedPlaces } from '../hooks/usePlans';
import type { PlaceDto } from '../contracts';
import { ApiRequestError } from '@/shared/lib/api';

export function CreatePlanPage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // Lugar: selector de guardados + texto libre
  const [useSavedPlace, setUseSavedPlace] = useState(false);
  const [selectedSavedPlaceId, setSelectedSavedPlaceId] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [savePlace, setSavePlace] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: savedPlaces } = useSavedPlaces(activeFamily?.id);
  const createPlan = useCreatePlan(activeFamily?.id ?? '');

  function resolvePlace(): PlaceDto | undefined {
    if (useSavedPlace && selectedSavedPlaceId) {
      const found = savedPlaces?.find((p) => p.id === selectedSavedPlaceId);
      if (found) return { name: found.name, address: found.address };
    }
    if (placeName.trim()) {
      return {
        name: placeName.trim(),
        address: placeAddress.trim() || undefined,
        // TODO(maps): aquí iría lat/lng del widget de Google Maps
      };
    }
    return undefined;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('El título del plan es obligatorio.');
      return;
    }

    const place = resolvePlace();

    createPlan.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: scheduledAt || undefined,
        place,
        savePlace: savePlace && Boolean(place),
      },
      {
        onSuccess: (plan) => {
          void navigate({ to: '/plans/$planId', params: { planId: plan.id } });
        },
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido crear el plan. Inténtalo de nuevo.';
          setErrorMsg(msg);
        },
      },
    );
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
          onClick={() => void navigate({ to: '/plans' })}
          style={styles.backBtn}
          aria-label="Volver a planes"
        >
          ← Planes
        </button>
        <h2 style={styles.heading}>Nuevo plan</h2>
      </header>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Título */}
        <div style={styles.fieldGroup}>
          <label htmlFor="plan-title" style={styles.label}>
            Título <span style={styles.required}>*</span>
          </label>
          <input
            id="plan-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="p. ej. Barbacoa en el parque"
            style={styles.input}
            autoFocus
          />
        </div>

        {/* Descripción */}
        <div style={styles.fieldGroup}>
          <label htmlFor="plan-description" style={styles.label}>
            Descripción (opcional)
          </label>
          <textarea
            id="plan-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Añade más detalles sobre el plan..."
            style={styles.textarea}
            rows={3}
          />
        </div>

        {/* Fecha y hora */}
        <div style={styles.fieldGroup}>
          <label htmlFor="plan-scheduled-at" style={styles.label}>
            Fecha y hora (opcional)
          </label>
          <input
            id="plan-scheduled-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* Lugar */}
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Lugar (opcional)</legend>

          {savedPlaces && savedPlaces.length > 0 && (
            <div style={styles.savedPlaceToggle}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={useSavedPlace}
                  onChange={(e) => {
                    setUseSavedPlace(e.target.checked);
                    setSelectedSavedPlaceId('');
                  }}
                  style={styles.checkbox}
                />
                Usar un lugar guardado
              </label>
            </div>
          )}

          {useSavedPlace && savedPlaces && savedPlaces.length > 0 ? (
            <div style={styles.fieldGroup}>
              <label htmlFor="saved-place-select" style={styles.label}>
                Lugar guardado
              </label>
              <select
                id="saved-place-select"
                value={selectedSavedPlaceId}
                onChange={(e) => setSelectedSavedPlaceId(e.target.value)}
                style={styles.select}
              >
                <option value="">Selecciona un lugar...</option>
                {savedPlaces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.address ? ` — ${p.address}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div style={styles.fieldGroup}>
                <label htmlFor="place-name" style={styles.label}>
                  Nombre del lugar
                </label>
                {/* TODO(maps): aquí iría el widget de Google Maps para seleccionar el lugar */}
                <input
                  id="place-name"
                  type="text"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder="p. ej. Parque del Retiro"
                  style={styles.input}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label htmlFor="place-address" style={styles.label}>
                  Dirección (opcional)
                </label>
                <input
                  id="place-address"
                  type="text"
                  value={placeAddress}
                  onChange={(e) => setPlaceAddress(e.target.value)}
                  placeholder="p. ej. Plaza de la Independencia, s/n, Madrid"
                  style={styles.input}
                />
              </div>

              {placeName.trim() && (
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={savePlace}
                    onChange={(e) => setSavePlace(e.target.checked)}
                    style={styles.checkbox}
                  />
                  Guardar este lugar para usarlo en el futuro
                </label>
              )}
            </>
          )}
        </fieldset>

        {errorMsg && (
          <p role="alert" style={styles.error}>
            {errorMsg}
          </p>
        )}

        <div style={styles.formActions}>
          <button
            type="button"
            onClick={() => void navigate({ to: '/plans' })}
            style={styles.btnSecondary}
          >
            Cancelar
          </button>
          <button type="submit" style={styles.btnPrimary} disabled={createPlan.isPending}>
            {createPlan.isPending ? 'Creando...' : 'Crear plan'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '560px',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  fieldset: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  legend: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
    padding: '0 var(--space-1)',
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  required: {
    color: 'var(--color-error)',
  },
  input: {
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  select: {
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  savedPlaceToggle: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text)',
    cursor: 'pointer',
  },
  checkbox: {
    accentColor: 'var(--color-accent)',
    width: '16px',
    height: '16px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--space-3)',
    paddingTop: 'var(--space-2)',
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
  },
  btnSecondary: {
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
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
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
};
