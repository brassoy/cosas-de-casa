/**
 * MenuView — vista presentacional del theme `cozysitcom` (Sitcom Cozy 70s).
 *
 * MISMA funcionalidad y contrato que la vista base (`MenuViewProps`): solo
 * cambia la estética. Reproduce el look retro cálido del kit estático
 * (`screens/themes/cozysitcom.tsx` → `Menu()`): cabecera de madera + cinta
 * mostaza, tarjetas `cz-frame`, tags `cz-tag` (verde retro = lo que tienes,
 * granate = lo que falta), botón denim para sugerir.
 *
 * Las clases `.cz-*` viven en la hoja compartida
 * `shared/theme/themes/cozysitcom.css`; las utilidades Tailwind semánticas
 * (bg-success, text-warning…) resuelven a los colores del theme vía
 * [data-theme='cozysitcom'].
 *
 * Presentacional PURO: solo props in / callbacks out. Sin fetch, hooks de
 * datos, stores ni navegación.
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { MenuViewProps } from '../types';

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
    <div className="cz space-y-4 px-5 pb-28">
      {/* ── Cabecera de madera + cinta mostaza ─────────────────────────── */}
      <div className="cz-pop">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="cz-serif text-4xl leading-none">Menú</h2>
            <p className="text-sm opacity-70 mt-1">Hoy en la cocina, con lo que hay en la nevera.</p>
          </div>
          <button
            type="button"
            onClick={onSuggest}
            disabled={isLoading}
            aria-label="Sugerir menú"
            className="cz-btn-denim inline-flex items-center gap-2 text-sm disabled:opacity-60"
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
        <div className="cz-stripe mt-3" />
      </div>

      {/* ── IA no disponible (503) ─────────────────────────────────────── */}
      {aiUnavailable && (
        <div role="alert" className="cz-frame cz-pop border-l-4 border-error">
          <p className="cz-serif text-lg text-error">La IA no está disponible</p>
          <p className="text-sm opacity-80 mt-1">
            Hay que recargar la clave de MiniMax. Inténtalo de nuevo más tarde.
          </p>
        </div>
      )}

      {/* ── Error genérico ─────────────────────────────────────────────── */}
      {error && (
        <div role="alert" className="cz-frame cz-pop border-l-4 border-error">
          <p className="text-sm font-bold text-error">{error}</p>
        </div>
      )}

      {/* ── Confirmación de añadido ────────────────────────────────────── */}
      {addedOk && (
        <div role="status" className="cz-frame cz-pop border-l-4 border-success">
          <p className="text-sm font-bold">Ingredientes añadidos a la lista de la compra. 🛒</p>
        </div>
      )}

      {/* ── Estado vacío inicial ───────────────────────────────────────── */}
      {!suggestion && !isLoading && !aiUnavailable && (
        <div className="cz-frame cz-pop text-center py-14 px-6">
          <div className="text-5xl mb-3" aria-hidden="true">
            🍽️
          </div>
          <p className="text-sm opacity-80">
            Pulsa "Sugerir menú" para obtener ideas de platos con lo que tienes en la nevera.
          </p>
        </div>
      )}

      {/* ── Sugerencia de menú ─────────────────────────────────────────── */}
      {suggestion?.dishes.map((dish, idx) => (
        <div key={`${dish.name}-${idx}`} className="cz-frame cz-pop space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="cz-serif text-2xl leading-tight">{dish.name}</h3>
              {dish.description && (
                <p className="text-sm opacity-80 mt-0.5">{dish.description}</p>
              )}
            </div>
            <span className="text-3xl shrink-0" aria-hidden="true">
              {['🍗', '🥗', '🍲', '🥘'][idx % 4]}
            </span>
          </div>

          {dish.usesFromFridge.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
              {dish.usesFromFridge.map((ing) => (
                <li
                  key={ing}
                  className="cz-tag inline-flex items-center gap-1 bg-success text-success-foreground"
                >
                  <span aria-hidden="true">✓</span>
                  {ing}
                </li>
              ))}
            </ul>
          )}

          {dish.missingIngredients.length > 0 && (
            <div>
              <p className="text-xs font-bold opacity-70 mb-1.5">Te falta:</p>
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
                        'cz-tag inline-flex items-center gap-1 min-h-[32px] cursor-pointer transition',
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
        <div className="fixed bottom-0 inset-x-0 z-30 cz-wallpaper border-t border-border">
          <div className="mx-auto max-w-[520px] px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-bold opacity-80">
              {selected.length === 0
                ? 'Selecciona ingredientes para añadirlos a la lista.'
                : `${selected.length} ingrediente${selected.length !== 1 ? 's' : ''} seleccionado${selected.length !== 1 ? 's' : ''}.`}
            </span>
            <button
              type="button"
              onClick={onAddToList}
              disabled={selected.length === 0 || isAdding}
              aria-label="Añadir ingredientes seleccionados a la lista de la compra"
              className="cz-btn-mustard text-sm shrink-0 disabled:opacity-50"
            >
              {isAdding ? 'Añadiendo…' : 'Añadir a la lista'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
