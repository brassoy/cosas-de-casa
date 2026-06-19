/**
 * MenuView — vista presentacional del theme `springfield` (cómic / Los Simpson).
 *
 * MISMA funcionalidad y contrato que la vista base (`MenuViewProps`): solo
 * cambia la estética. Reproduce el look cómic del kit estático
 * (`screens/themes/springfield.tsx` → `Menu()`): cabecera amarilla `sf-card-y`
 * con titular Bangers, tarjetas `sf-card` con bamboleo `sf-wob`, tags `sf-tag`
 * (verde = lo que tienes, rojo = lo que falta), botón `sf-btn` para sugerir.
 *
 * Las clases `.sf-*` viven en la hoja compartida
 * `shared/theme/themes/springfield.css`; las utilidades Tailwind semánticas
 * (bg-primary, text-success-foreground…) resuelven a los colores del theme vía
 * [data-theme='springfield'].
 *
 * Presentacional PURO: solo props in / callbacks out. Sin fetch, hooks de
 * datos, stores ni navegación.
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { MenuViewProps } from '../types';

// Emojis decorativos rotativos por plato (puro adorno; sin datos falsos).
const DISH_EMOJI = ['🍗', '🥗', '🍲', '🥘'] as const;

export default function MenuView(props: MenuViewProps) {
  const {
    suggestion,
    isLoading,
    isAdding,
    aiUnavailable,
    error,
    addedOk,
    selected,
    onToggleIngredient,
    onSuggest,
    onAddToList,
  } = props;

  const selectedSet = new Set(selected);

  // Ingredientes faltantes únicos en toda la sugerencia (para decidir si se
  // muestra la barra inferior de "Añadir a la lista").
  const uniqueMissing = suggestion
    ? [...new Set(suggestion.dishes.flatMap((d) => d.missingIngredients))]
    : [];

  return (
    <div className="sf sf-dot min-h-[80dvh] space-y-4 px-5 pt-8 pb-28">
      {/* ── Cabecera amarilla cómic ────────────────────────────────────── */}
      <div className="sf-card-y sf-pop p-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="sf-bangers text-4xl leading-none">Menú de la nevera</h2>
            <p className="sf-fredoka text-sm mt-1">Sugerencias con lo que tienes.</p>
          </div>
          <button
            type="button"
            onClick={onSuggest}
            disabled={isLoading}
            aria-label="Sugerir menú"
            className="sf-btn inline-flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                Pensando…
              </>
            ) : (
              'Sugerir menú'
            )}
          </button>
        </div>
      </div>

      {/* ── IA no disponible (503) ─────────────────────────────────────── */}
      {aiUnavailable && (
        <div role="alert" className="sf-card sf-pop p-4 border-error">
          <p className="sf-bangers text-2xl text-error">La IA no está disponible</p>
          <p className="sf-fredoka text-sm opacity-80 mt-1">
            Hay que recargar la clave de MiniMax. Inténtalo de nuevo más tarde.
          </p>
        </div>
      )}

      {/* ── Error genérico ─────────────────────────────────────────────── */}
      {error && (
        <div role="alert" className="sf-card sf-pop p-4 border-error">
          <p className="sf-fredoka text-sm text-error">{error}</p>
        </div>
      )}

      {/* ── Confirmación de añadido ────────────────────────────────────── */}
      {addedOk && (
        <div role="status" className="sf-card-g sf-pop p-4">
          <p className="sf-fredoka text-sm">Ingredientes añadidos a la lista de la compra. 🛒</p>
        </div>
      )}

      {/* ── Estado vacío inicial ───────────────────────────────────────── */}
      {!suggestion && !isLoading && !aiUnavailable && (
        <div className="sf-card sf-pop text-center py-14 px-6">
          <div className="text-5xl mb-3" aria-hidden="true">
            🍽️
          </div>
          <p className="sf-fredoka text-sm opacity-80">
            Pulsa "Sugerir menú" para obtener ideas de platos con lo que tienes en la nevera.
          </p>
        </div>
      )}

      {/* ── Sugerencia de menú ─────────────────────────────────────────── */}
      {suggestion?.dishes.map((dish, idx) => (
        <div key={`${dish.name}-${idx}`} className="sf-card sf-pop sf-wob p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="sf-bangers text-2xl leading-tight">{dish.name}</h3>
              {dish.description && (
                <p className="sf-fredoka text-sm opacity-80 mt-0.5">{dish.description}</p>
              )}
            </div>
            <span className="text-3xl shrink-0" aria-hidden="true">
              {DISH_EMOJI[idx % DISH_EMOJI.length]!}
            </span>
          </div>

          {dish.usesFromFridge.length > 0 && (
            <div>
              <p className="sf-fredoka text-xs uppercase opacity-80 mb-1.5">Tienes:</p>
              <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
                {dish.usesFromFridge.map((ing) => (
                  <li
                    key={ing}
                    className="sf-tag inline-flex items-center gap-1 bg-success text-success-foreground"
                  >
                    <span aria-hidden="true">✓</span>
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dish.missingIngredients.length > 0 && (
            <div>
              <p className="sf-fredoka text-xs uppercase opacity-80 mb-1.5">Te falta:</p>
              <div className="flex flex-wrap gap-1.5">
                {dish.missingIngredients.map((ing) => {
                  const checked = selectedSet.has(ing);
                  return (
                    <button
                      key={ing}
                      type="button"
                      onClick={() => onToggleIngredient(ing)}
                      aria-pressed={checked}
                      aria-label={`${checked ? 'Deseleccionar' : 'Seleccionar'} ${ing}`}
                      className={cn(
                        'sf-tag inline-flex items-center gap-1 min-h-[32px] cursor-pointer transition',
                        checked
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-error text-error-foreground',
                      )}
                    >
                      <span aria-hidden="true">{checked ? '✓' : '+'}</span>
                      {ing}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* ── Barra inferior sticky: añadir a la lista ───────────────────── */}
      {suggestion && uniqueMissing.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30">
          <div className="sf-zig" />
          <div className="bg-card border-t-[3px] border-border">
            <div className="mx-auto max-w-[520px] px-5 py-3 flex items-center justify-between gap-3">
              <span className="sf-fredoka text-sm opacity-80">
                {selected.length === 0
                  ? 'Selecciona ingredientes para añadirlos a la lista.'
                  : `${selected.length} ingrediente${selected.length !== 1 ? 's' : ''} seleccionado${selected.length !== 1 ? 's' : ''}.`}
              </span>
              <button
                type="button"
                onClick={onAddToList}
                disabled={selected.length === 0 || isAdding}
                aria-label="Añadir ingredientes seleccionados a la lista de la compra"
                className="sf-btn sf-btn-g text-sm shrink-0 disabled:opacity-50"
              >
                {isAdding ? 'Añadiendo…' : 'Añadir a la lista'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
