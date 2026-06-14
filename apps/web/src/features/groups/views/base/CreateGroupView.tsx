/**
 * CreateGroupView — vista presentacional `base` (shadcn) de crear peña.
 *
 * Mismo patrón que `AuthView`: el formulario controlado y la validación de UI
 * (nombre obligatorio) viven en la vista; el container ejecuta la mutación,
 * navega, invalida queries y mapea el error de negocio (`ApiRequestError`), que
 * llega por la prop `error`.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 */

import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import type { CreateGroupViewProps } from '../types';

export default function CreateGroupView({ isSubmitting, error, onSubmit }: CreateGroupViewProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Prioriza la validación de UI; si no, el error de negocio del container.
  const displayedError = localError ?? error ?? null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('El nombre de la peña es obligatorio.');
      return;
    }

    onSubmit({ name: name.trim(), description: description.trim() || undefined });
  }

  return (
    <div className="grid min-h-[80dvh] place-items-center px-4">
      <Card className="w-full max-w-[480px] p-8">
        <h2 className="text-2xl font-bold">Crea una peña</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ponle nombre a tu grupo y empieza a compartir la experiencia con tus amigos.
        </p>

        {displayedError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{displayedError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">
              Nombre <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="group-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. Peña Los Compadres"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-desc">
              Descripción{' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="group-desc"
              rows={3}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Una descripción breve de la peña"
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="mt-2 h-11 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear peña'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
