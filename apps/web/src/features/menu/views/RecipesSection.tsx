/**
 * RecipesSection — sección presentacional "Mis recetas" compartida por los 4
 * themes de la feature `menu`.
 *
 * Presentacional PURO: solo props in / callbacks out. Sin fetch, hooks de datos
 * ni stores. Usa utilidades Tailwind con tokens semánticos
 * (`bg-success`, `text-error`, `border-border`…) que resuelven al color del
 * theme activo vía `[data-theme]`, así que encaja con base/cozy/cozysitcom/
 * springfield sin duplicar la lógica.
 *
 * Funcionalidad:
 *  - Crear una receta: nombre + lista de ingredientes editable (añadir/quitar líneas).
 *  - Listar recetas; al desplegar una, mostrar cada ingrediente con un badge
 *    "✓ en Nevera/Congelador/Despensa" (foundAs/location) o "✗ Falta".
 *  - "Añadir lo que falta a la compra" (reusa el flujo to-list con los `missing`).
 *  - Borrar receta.
 */

import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { FridgeLocation } from '@cosasdecasa/contracts';
import type { MenuViewProps, RecipeWithAvailability } from './types';

// ── Etiquetas de ubicación (peninsular) ─────────────────────────────────────

const LOCATION_LABEL: Record<FridgeLocation, string> = {
  FRIDGE: 'Nevera',
  FREEZER: 'Congelador',
  PANTRY: 'Despensa',
  DISCARDED: 'Tirado',
};

type RecipesSectionProps = Pick<
  MenuViewProps,
  | 'recipes'
  | 'recipesLoading'
  | 'isCreatingRecipe'
  | 'isAdding'
  | 'newRecipeName'
  | 'newRecipeIngredients'
  | 'onChangeRecipeName'
  | 'onChangeIngredient'
  | 'onAddIngredientLine'
  | 'onRemoveIngredientLine'
  | 'onCreateRecipe'
  | 'onToggleRecipe'
  | 'onDeleteRecipe'
  | 'onAddMissingToList'
>;

export function RecipesSection(props: RecipesSectionProps) {
  const {
    recipes = [],
    recipesLoading,
    isCreatingRecipe,
    newRecipeName,
    newRecipeIngredients,
    onChangeRecipeName,
    onChangeIngredient,
    onAddIngredientLine,
    onRemoveIngredientLine,
    onCreateRecipe,
    onToggleRecipe,
    onDeleteRecipe,
    onAddMissingToList,
  } = props;

  const canCreate =
    newRecipeName.trim().length > 0 &&
    newRecipeIngredients.some((i) => i.trim().length > 0) &&
    !isCreatingRecipe;

  return (
    <section aria-labelledby="recipes-heading" className="space-y-4 pt-2">
      <h2 id="recipes-heading" className="text-2xl font-bold">
        Mis recetas
      </h2>

      {/* ── Formulario de nueva receta ─────────────────────────────────── */}
      <form
        className="rounded-xl border border-border bg-card p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (canCreate) onCreateRecipe();
        }}
      >
        <div>
          <label htmlFor="recipe-name" className="text-sm font-medium">
            Nombre de la receta
          </label>
          <input
            id="recipe-name"
            type="text"
            value={newRecipeName}
            onChange={(e) => onChangeRecipeName(e.target.value)}
            placeholder="Ensaladilla pablos"
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Ingredientes</span>
          {newRecipeIngredients.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => onChangeIngredient(index, e.target.value)}
                placeholder="patata cocida"
                maxLength={200}
                aria-label={`Ingrediente ${index + 1}`}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => onRemoveIngredientLine(index)}
                aria-label={`Quitar ingrediente ${index + 1}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-card"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onAddIngredientLine}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Añadir ingrediente
          </button>
        </div>

        <button
          type="submit"
          disabled={!canCreate}
          aria-label="Guardar receta"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isCreatingRecipe ? (
            <>
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              Guardando…
            </>
          ) : (
            'Guardar receta'
          )}
        </button>
      </form>

      {/* ── Listado de recetas ─────────────────────────────────────────── */}
      {recipesLoading && (
        <p className="text-sm text-muted-foreground">Cargando recetas…</p>
      )}

      {!recipesLoading && recipes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aún no tienes recetas. Crea la primera arriba.
        </p>
      )}

      <ul className="list-none space-y-3 p-0 m-0">
        {recipes.map((item) => (
          <RecipeCard
            key={item.recipe.id}
            item={item}
            isAdding={props.isAdding}
            onToggle={() => onToggleRecipe(item.recipe.id)}
            onDelete={() => onDeleteRecipe(item.recipe.id)}
            onAddMissing={() => onAddMissingToList(item.recipe.id)}
          />
        ))}
      </ul>
    </section>
  );
}

// ── Tarjeta de una receta ───────────────────────────────────────────────────

function RecipeCard(props: {
  item: RecipeWithAvailability;
  isAdding?: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onAddMissing: () => void;
}) {
  const { item, isAdding, onToggle, onDelete, onAddMissing } = props;
  const { recipe, availability, isLoading, expanded } = item;
  const missingCount = availability?.missing.length ?? 0;

  return (
    <li className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 p-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Replegar' : 'Desplegar'} ${recipe.name}`}
          className="flex-1 text-left"
        >
          <span className="font-semibold">{recipe.name}</span>
          <span className="block text-xs text-muted-foreground">
            {recipe.ingredients.length} ingrediente
            {recipe.ingredients.length !== 1 ? 's' : ''}
          </span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${recipe.name}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-error hover:bg-card"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground">
              Comprobando qué tienes…
            </p>
          )}

          {!isLoading && availability && (
            <>
              <ul className="list-none space-y-1.5 p-0 m-0">
                {availability.ingredients.map((ing) => (
                  <li
                    key={ing.name}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>{ing.name}</span>
                    {ing.available && ing.location ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--color-success) 15%, transparent)',
                          color: 'var(--color-success)',
                        }}
                      >
                        <span aria-hidden="true">✓</span>
                        en {LOCATION_LABEL[ing.location]}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        )}
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--color-error) 15%, transparent)',
                          color: 'var(--color-error)',
                        }}
                      >
                        <span aria-hidden="true">✗</span>
                        Falta
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {missingCount > 0 && (
                <button
                  type="button"
                  onClick={onAddMissing}
                  disabled={isAdding}
                  aria-label={`Añadir lo que falta de ${recipe.name} a la lista de la compra`}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {isAdding
                    ? 'Añadiendo…'
                    : `Añadir lo que falta (${missingCount}) a la compra`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
