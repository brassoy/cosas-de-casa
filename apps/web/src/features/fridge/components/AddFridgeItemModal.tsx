import { useState } from 'react';
import { useCreateFridgeItem } from '../hooks/useFridge';
import { ApiRequestError } from '@/shared/lib/api';
import { FRIDGE_LOCATION_LABELS } from '../types';
import type { FridgeLocation } from '../types';

interface AddFridgeItemModalProps {
  familyId: string;
  onClose: () => void;
}

export function AddFridgeItemModal({ familyId, onClose }: AddFridgeItemModalProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [location, setLocation] = useState<FridgeLocation>('FRIDGE');
  const [expiryDate, setExpiryDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const createItem = useCreateFridgeItem(familyId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    const numQty = quantity ? Number(quantity) : NaN;
    if (quantity && (isNaN(numQty) || numQty <= 0)) {
      setFormError('La cantidad debe ser un número mayor que 0.');
      return;
    }

    createItem.mutate(
      {
        name: name.trim(),
        // El contrato espera string opcional; lo pasamos como string si hay valor.
        quantity: quantity ? String(numQty) : undefined,
        unit: unit.trim() || undefined,
        location,
        expiryDate: expiryDate || undefined,
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido añadir el producto.';
          setFormError(msg);
        },
      },
    );
  }

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Añadir producto"
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Añadir producto</h2>

        <form onSubmit={(e) => { void handleSubmit(e); }} style={styles.form}>
          {/* Nombre */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="fridge-name">
              Nombre{' '}
              <span aria-hidden="true" style={{ color: 'var(--color-error)' }}>
                *
              </span>
            </label>
            <input
              id="fridge-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. Leche entera"
              style={styles.input}
              maxLength={200}
              required
              autoFocus
            />
          </div>

          {/* Cantidad + unidad */}
          <div style={styles.twoCol}>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="fridge-quantity">
                Cantidad
              </label>
              <input
                id="fridge-quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="p. ej. 2"
                style={styles.input}
                aria-label="Cantidad"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="fridge-unit">
                Unidad
              </label>
              <input
                id="fridge-unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="l, kg, ud…"
                style={styles.input}
                maxLength={20}
                aria-label="Unidad"
              />
            </div>
          </div>

          {/* Ubicación */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="fridge-location">
              Ubicación
            </label>
            <select
              id="fridge-location"
              value={location}
              onChange={(e) => setLocation(e.target.value as FridgeLocation)}
              style={styles.select}
              aria-label="Ubicación"
            >
              {(Object.keys(FRIDGE_LOCATION_LABELS) as FridgeLocation[]).map((loc) => (
                <option key={loc} value={loc}>
                  {FRIDGE_LOCATION_LABELS[loc]}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha de caducidad */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="fridge-expires">
              Fecha de caducidad
            </label>
            <input
              id="fridge-expires"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              style={styles.input}
              aria-label="Fecha de caducidad"
            />
          </div>

          {formError && (
            <p role="alert" style={styles.error}>
              {formError}
            </p>
          )}

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.btnSecondary}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createItem.isPending || !name.trim()}
              style={styles.btnPrimary}
            >
              {createItem.isPending ? 'Añadiendo…' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 'var(--space-4)',
  },
  modal: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-6)',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90dvh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
    boxShadow: 'var(--shadow-lg)',
  },
  modalTitle: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
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
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    width: '100%',
    cursor: 'pointer',
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-3)',
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-3)',
    justifyContent: 'flex-end',
    paddingTop: 'var(--space-2)',
  },
  btnPrimary: {
    padding: 'var(--space-2) var(--space-6)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: 'var(--space-2) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
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
