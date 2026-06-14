/**
 * MenuView — vista presentacional `base` (shadcn) de la pantalla de menú.
 *
 * Porta el JSX del componente base del kit (Lovable `MenuPage`) a las
 * primitivas shadcn de `@/shared/ui/*`, reconciliando los tipos con los DTOs
 * reales y preservando el contrato de accesibilidad (roles, aria-labels) que
 * el container y los tests esperan.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores.
 */

import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/shared/ui/alert';
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
    <div className="space-y-4 pb-24">
      {/* ── Cabecera ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-bold">Menú de la nevera</h2>
        <Button onClick={onSuggest} disabled={isLoading} aria-label="Sugerir menú">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Pensando…
            </>
          ) : (
            'Sugerir menú'
          )}
        </Button>
      </div>

      {/* ── IA no disponible (503) ─────────────────────────────────────── */}
      {aiUnavailable && (
        <Alert variant="destructive">
          <AlertTitle>La IA no está disponible</AlertTitle>
          <AlertDescription>
            Hay que recargar la clave de MiniMax. Inténtalo de nuevo más tarde.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Error genérico ─────────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Confirmación de añadido ────────────────────────────────────── */}
      {addedOk && (
        <Alert>
          <AlertDescription>Ingredientes añadidos a la lista de la compra. 🛒</AlertDescription>
        </Alert>
      )}

      {/* ── Estado vacío inicial ───────────────────────────────────────── */}
      {!suggestion && !isLoading && !aiUnavailable && (
        <div className="text-center py-16 px-6 text-muted-foreground">
          <div className="text-5xl mb-3">🍽️</div>
          <p>
            Pulsa "Sugerir menú" para obtener ideas de platos con lo que tienes en la nevera.
          </p>
        </div>
      )}

      {/* ── Sugerencia de menú ─────────────────────────────────────────── */}
      {suggestion?.dishes.map((dish, idx) => (
        <Card key={`${dish.name}-${idx}`} className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold">{dish.name}</h3>
            {dish.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{dish.description}</p>
            )}
          </div>

          {dish.usesFromFridge.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
              {dish.usesFromFridge.map((ing) => (
                <li
                  key={ing}
                  className="text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                    color: 'var(--color-success)',
                  }}
                >
                  <span aria-hidden="true">✓</span>
                  {ing}
                </li>
              ))}
            </ul>
          )}

          {dish.missingIngredients.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Te falta:</p>
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
                        'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition min-h-[32px] cursor-pointer',
                        checked
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-card',
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
        </Card>
      ))}

      {/* ── Barra inferior sticky: añadir a la lista ───────────────────── */}
      {suggestion && uniqueMissing.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-[480px] px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {selected.length === 0
                ? 'Selecciona ingredientes para añadirlos a la lista.'
                : `${selected.length} ingrediente${selected.length !== 1 ? 's' : ''} seleccionado${selected.length !== 1 ? 's' : ''}.`}
            </span>
            <Button
              onClick={onAddToList}
              disabled={selected.length === 0 || isAdding}
              aria-label="Añadir ingredientes seleccionados a la lista de la compra"
            >
              {isAdding ? 'Añadiendo…' : 'Añadir a la lista'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
