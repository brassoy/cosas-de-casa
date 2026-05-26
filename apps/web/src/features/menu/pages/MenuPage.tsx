/**
 * MenuPage — sugerir menú desde la nevera con IA.
 *
 * Flujo:
 *  1. Botón "Sugerir menú" → POST /families/:id/menu/suggest.
 *     - 503 → aviso IA no disponible.
 *     - OK  → muestra platos con ingredientes que faltan.
 *  2. El usuario selecciona ingredientes faltantes → "Añadir a la lista"
 *     → POST /families/:id/menu/to-list { ingredients, listId? }.
 */

import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  useSuggestMenu,
  useMenuToList,
  type ApiRequestError,
} from '../hooks/useMenu';
import type { MenuDishDto, MenuSuggestionDto } from '../contracts';

// ── Helper ────────────────────────────────────────────────────────────────────

function isAiUnavailable(error: ApiRequestError | null): boolean {
  return error?.status === 503;
}

// ── Componente de plato ───────────────────────────────────────────────────────

interface DishCardProps {
  dish: MenuDishDto;
  selectedIngredients: Set<string>;
  onToggleIngredient: (ingredient: string) => void;
}

function DishCard({ dish, selectedIngredients, onToggleIngredient }: DishCardProps) {
  return (
    <article style={styles.dishCard}>
      <h3 style={styles.dishName}>{dish.name}</h3>
      {dish.description && <p style={styles.dishDesc}>{dish.description}</p>}

      {dish.usesFromFridge.length > 0 && (
        <div style={styles.ingredientGroup}>
          <p style={styles.ingredientGroupLabel}>Tienes en la nevera</p>
          <ul style={styles.chipList}>
            {dish.usesFromFridge.map((ing) => (
              <li key={ing} style={styles.chipGreen}>
                {ing}
              </li>
            ))}
          </ul>
        </div>
      )}

      {dish.missingIngredients.length > 0 && (
        <div style={styles.ingredientGroup}>
          <p style={styles.ingredientGroupLabel}>Ingredientes que faltan</p>
          <ul style={styles.chipList}>
            {dish.missingIngredients.map((ing) => {
              const checked = selectedIngredients.has(ing);
              return (
                <li key={ing}>
                  <button
                    type="button"
                    onClick={() => onToggleIngredient(ing)}
                    style={{
                      ...styles.chipToggle,
                      backgroundColor: checked
                        ? 'var(--color-accent)'
                        : 'var(--color-surface)',
                      color: checked
                        ? 'var(--color-text-inverse)'
                        : 'var(--color-text)',
                      borderColor: checked
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                    }}
                    aria-pressed={checked}
                    aria-label={`${checked ? 'Deseleccionar' : 'Seleccionar'} ${ing}`}
                  >
                    {checked ? '✓ ' : ''}{ing}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function MenuPage() {
  const { familyId } = useParams({ strict: false }) as { familyId: string };

  const suggestMutation = useSuggestMenu(familyId);
  const toListMutation = useMenuToList(familyId);

  const [suggestion, setSuggestion] = useState<MenuSuggestionDto | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [toListDone, setToListDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleSuggest() {
    setAiUnavailable(false);
    setErrorMsg(null);
    setToListDone(false);

    suggestMutation.mutate(
      {},
      {
        onSuccess: (data) => {
          setSuggestion(data);
          setSelectedIngredients(new Set());
        },
        onError: (err) => {
          if (isAiUnavailable(err)) {
            setAiUnavailable(true);
          } else {
            setErrorMsg('No se ha podido obtener la sugerencia de menú. Inténtalo de nuevo.');
          }
        },
      },
    );
  }

  function handleToggleIngredient(ing: string) {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ing)) {
        next.delete(ing);
      } else {
        next.add(ing);
      }
      return next;
    });
  }

  function handleAddToList() {
    const ingredients = Array.from(selectedIngredients);
    if (ingredients.length === 0) return;

    setErrorMsg(null);
    toListMutation.mutate(
      { ingredients },
      {
        onSuccess: () => {
          setToListDone(true);
          setSelectedIngredients(new Set());
        },
        onError: () => {
          setErrorMsg('No se han podido añadir los ingredientes a la lista.');
        },
      },
    );
  }

  const allMissing = suggestion
    ? suggestion.dishes.flatMap((d) => d.missingIngredients)
    : [];
  const uniqueMissing = [...new Set(allMissing)];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>Menú de la nevera</h2>
        <button
          type="button"
          onClick={handleSuggest}
          style={styles.btnPrimary}
          disabled={suggestMutation.isPending}
          aria-label="Sugerir menú"
        >
          {suggestMutation.isPending ? 'Pensando…' : 'Sugerir menú'}
        </button>
      </header>

      {/* ── IA no disponible ─────────────────────────────────────────── */}
      {aiUnavailable && (
        <div role="alert" style={styles.aiUnavailable}>
          <p style={styles.aiUnavailableTitle}>La IA no está disponible</p>
          <p style={styles.aiUnavailableDesc}>
            Hay que recargar la clave de MiniMax. Inténtalo de nuevo más tarde.
          </p>
        </div>
      )}

      {/* ── Error genérico ────────────────────────────────────────────── */}
      {errorMsg && (
        <p role="alert" style={styles.errorBanner}>
          {errorMsg}
        </p>
      )}

      {/* ── Confirmación añadido ──────────────────────────────────────── */}
      {toListDone && (
        <div role="status" style={styles.successBanner}>
          Ingredientes añadidos a la lista de la compra.
        </div>
      )}

      {/* ── Estado vacío inicial ──────────────────────────────────────── */}
      {!suggestion && !suggestMutation.isPending && !aiUnavailable && (
        <div style={styles.empty}>
          <p style={styles.emptyText}>
            Pulsa "Sugerir menú" para obtener ideas de platos con lo que tienes en la nevera.
          </p>
        </div>
      )}

      {/* ── Sugerencia de menú ────────────────────────────────────────── */}
      {suggestion && (
        <>
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Platos sugeridos ({suggestion.dishes.length})</h3>
            <div style={styles.dishList}>
              {suggestion.dishes.map((dish, idx) => (
                <DishCard
                  key={`${dish.name}-${idx}`}
                  dish={dish}
                  selectedIngredients={selectedIngredients}
                  onToggleIngredient={handleToggleIngredient}
                />
              ))}
            </div>
          </section>

          {/* ── Barra inferior: añadir a la lista ─────────────────────── */}
          {uniqueMissing.length > 0 && (
            <div style={styles.addToListBar}>
              <p style={styles.addToListInfo}>
                {selectedIngredients.size === 0
                  ? 'Selecciona ingredientes para añadirlos a la lista.'
                  : `${selectedIngredients.size} ingrediente${selectedIngredients.size !== 1 ? 's' : ''} seleccionado${selectedIngredients.size !== 1 ? 's' : ''}.`}
              </p>
              <button
                type="button"
                onClick={handleAddToList}
                style={styles.btnPrimary}
                disabled={selectedIngredients.size === 0 || toListMutation.isPending}
                aria-label="Añadir ingredientes seleccionados a la lista de la compra"
              >
                {toListMutation.isPending ? 'Añadiendo…' : 'Añadir a la lista'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-4)',
    flexWrap: 'wrap',
    gap: 'var(--space-3)',
  },
  pageTitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  btnPrimary: {
    padding: 'var(--space-2) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
  aiUnavailable: {
    backgroundColor: 'rgba(234,179,8,0.1)',
    border: '1px solid rgba(234,179,8,0.4)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  aiUnavailableTitle: {
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  aiUnavailableDesc: {
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
  successBanner: {
    backgroundColor: 'rgba(22,163,74,0.1)',
    border: '1px solid rgba(22,163,74,0.4)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: '#15803d',
    fontSize: 'var(--font-size-sm)',
  },
  empty: {
    padding: 'var(--space-12) var(--space-4)',
    display: 'flex',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    maxWidth: '320px',
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
  dishList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  dishCard: {
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-5)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  dishName: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  dishDesc: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  ingredientGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  ingredientGroupLabel: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  chipList: {
    listStyle: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
  },
  chipGreen: {
    fontSize: 'var(--font-size-xs)',
    backgroundColor: 'rgba(22,163,74,0.1)',
    color: '#15803d',
    border: '1px solid rgba(22,163,74,0.3)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px var(--space-2)',
  },
  chipToggle: {
    fontSize: 'var(--font-size-xs)',
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    padding: '2px var(--space-2)',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, color 0.15s ease',
  },
  addToListBar: {
    position: 'sticky',
    bottom: 0,
    backgroundColor: 'var(--color-surface)',
    borderTop: '1px solid var(--color-border)',
    padding: 'var(--space-4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
    marginLeft: 'calc(-1 * var(--space-6))',
    marginRight: 'calc(-1 * var(--space-6))',
    paddingLeft: 'var(--space-6)',
    paddingRight: 'var(--space-6)',
  },
  addToListInfo: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
};
