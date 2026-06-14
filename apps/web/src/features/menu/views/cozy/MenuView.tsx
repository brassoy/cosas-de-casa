/**
 * MenuView — vista presentacional del theme `cozy` (cuaderno de papel manuscrito).
 *
 * MISMA funcionalidad y contrato que la vista base (`MenuViewProps`): solo
 * cambia la estética. Reproduce el look de cuaderno del kit estático
 * (`screens/themes/cozy.tsx` → `Menu()`): papel pautado `ck-page`, notas de
 * papel `ck-card` sujetas con cinta `ck-tape`, titulares manuscritos `ck-marker`
 * (Caveat), pills `ck-tag` (verde = lo que tienes, rojo = lo que falta, azul =
 * seleccionado), botones pill `ck-btn` y sello `ck-stamp` para el aviso de la IA.
 *
 * Las clases `.ck-*` viven en la hoja compartida `shared/theme/themes/cozy.css`;
 * las utilidades Tailwind semánticas (bg-success, bg-error, bg-primary…)
 * resuelven a los colores del theme vía [data-theme='cozy'].
 *
 * Presentacional PURO: solo props in / callbacks out. Sin fetch, hooks de
 * datos, stores ni navegación.
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { MenuViewProps } from '../types';

// Emojis decorativos rotativos por plato (puro adorno; sin datos falsos).
// La maqueta cozy usaba `["🍗","🥗"][i]` fijo (rompía con 3+ platos); aquí se
// cicla con módulo y non-null assertion (noUncheckedIndexedAccess activo).
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
    <div className="ck ck-page -mx-4 -mt-4 px-4 pt-6 pb-28 min-h-full space-y-4">
      {/* ── Cabecera: titular manuscrito + botón sugerir ───────────────── */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="ck-marker text-base opacity-70 leading-none">— diario de la casa —</p>
          {/* La utilidad text-accent de Tailwind v4 mapea a accent-subtle (tinte
              pálido); el azul de boli del theme es el token crudo --color-accent. */}
          <h2 className="ck-marker text-5xl leading-none mt-1" style={{ color: 'var(--color-accent)' }}>
            qué cenamos
          </h2>
          <p className="text-base mt-2 opacity-80">Ideas con lo que hay en la nevera.</p>
        </div>
        <button
          type="button"
          onClick={onSuggest}
          disabled={isLoading}
          aria-label="Sugerir menú"
          className="ck-btn ck-btn-blue inline-flex items-center gap-2 disabled:opacity-60"
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

      {/* ── IA no disponible (503) ─────────────────────────────────────── */}
      {aiUnavailable && (
        <div role="alert" className="ck-card p-5 pt-7">
          <span className="ck-tape" aria-hidden="true" />
          <span className="ck-stamp">no disponible</span>
          <p className="ck-marker text-2xl text-error mt-2">La IA no está disponible</p>
          <p className="text-base opacity-80 mt-1">
            Hay que recargar la clave de MiniMax. Inténtalo de nuevo más tarde.
          </p>
        </div>
      )}

      {/* ── Error genérico ─────────────────────────────────────────────── */}
      {error && (
        <div role="alert" className="ck-card p-4">
          <span className="ck-pin" aria-hidden="true" />
          <p className="text-base text-error">{error}</p>
        </div>
      )}

      {/* ── Confirmación de añadido ────────────────────────────────────── */}
      {addedOk && (
        <div role="status" className="ck-card p-4 pt-6">
          <span className="ck-tape" aria-hidden="true" />
          <p className="text-base">Ingredientes añadidos a la lista de la compra. 🛒</p>
        </div>
      )}

      {/* ── Estado vacío inicial ───────────────────────────────────────── */}
      {!suggestion && !isLoading && !aiUnavailable && (
        <div className="ck-card p-6 pt-7 text-center">
          <span className="ck-tape" aria-hidden="true" />
          <div className="text-5xl mb-3" aria-hidden="true">
            🍽️
          </div>
          <p className="text-base opacity-80">
            Pulsa "Sugerir menú" para obtener ideas de platos con lo que tienes en la nevera.
          </p>
        </div>
      )}

      {/* ── Sugerencia de menú ─────────────────────────────────────────── */}
      {suggestion?.dishes.map((dish, idx) => (
        <div key={`${dish.name}-${idx}`} className="ck-card p-4 pt-6 space-y-3">
          <span className="ck-tape" aria-hidden="true" />
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="ck-marker text-3xl leading-none" style={{ color: 'var(--color-accent)' }}>
                {dish.name}
              </h3>
              {dish.description && (
                <p className="text-base opacity-80 mt-1">{dish.description}</p>
              )}
            </div>
            <span className="text-3xl shrink-0" aria-hidden="true">
              {DISH_EMOJI[idx % DISH_EMOJI.length]!}
            </span>
          </div>

          {dish.usesFromFridge.length > 0 && (
            <div>
              <p className="ck-marker text-lg text-success leading-none mb-1.5">tienes:</p>
              <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
                {dish.usesFromFridge.map((ing) => (
                  <li
                    key={ing}
                    className="ck-tag inline-flex items-center gap-1 bg-success text-success-foreground"
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
              <p className="ck-marker text-lg text-error leading-none mb-1.5">faltan:</p>
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
                        'ck-tag inline-flex items-center gap-1 min-h-[32px] cursor-pointer transition',
                        checked
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-error text-error-foreground opacity-90 hover:opacity-100',
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
        <div
          className="fixed bottom-0 inset-x-0 z-30 ck-page border-t-2 border-dashed"
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          <div className="mx-auto max-w-[520px] px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-base opacity-80">
              {selected.length === 0
                ? 'Selecciona ingredientes para añadirlos a la lista.'
                : `${selected.length} ingrediente${selected.length !== 1 ? 's' : ''} seleccionado${selected.length !== 1 ? 's' : ''}.`}
            </span>
            <button
              type="button"
              onClick={onAddToList}
              disabled={selected.length === 0 || isAdding}
              aria-label="Añadir ingredientes seleccionados a la lista de la compra"
              className="ck-btn ck-btn-red shrink-0 disabled:opacity-50"
            >
              {isAdding ? 'Añadiendo…' : 'Añadir a la lista'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
