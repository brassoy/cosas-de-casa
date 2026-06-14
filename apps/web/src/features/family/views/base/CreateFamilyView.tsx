/* ─── Vista presentacional base — family_create ─────────────────────────────
 *
 * Theme `base` (estética shadcn del kit de Lovable). Formulario para crear una
 * unidad familiar (nombre obligatorio + descripción opcional).
 *
 * Presentacional puro: solo props in / callbacks out. Mantiene la validación de
 * formulario local (nombre no vacío) que la lógica actual ya hacía y de la que
 * dependen los tests — esa validación es UI, no negocio. El error de negocio
 * (`ApiRequestError`) llega por la prop `error` desde el container.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import type { CreateFamilyViewProps } from '../types';

export default function CreateFamilyView(props: CreateFamilyViewProps) {
  const { isSubmitting, error, onSubmit } = props;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const displayedError = localError ?? error ?? null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('El nombre de la unidad familiar es obligatorio.');
      return;
    }

    onSubmit({ name: name.trim(), description: description.trim() || undefined });
  }

  return (
    <div className="min-h-[80dvh] grid place-items-center px-4">
      <div className="w-full max-w-[480px] bg-card text-card-foreground rounded-card shadow-lg border border-border p-8 space-y-5">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Crea tu unidad familiar</h2>
          <p className="text-sm text-muted-foreground">
            Da un nombre a tu hogar y empieza a gestionar todo lo de casa juntos.
          </p>
        </div>

        {displayedError && (
          <Alert variant="destructive">
            <AlertDescription>{displayedError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="family-name">
              Nombre <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="family-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. Casa García"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="family-desc">
              Descripción{' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="family-desc"
              rows={3}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Una descripción breve de tu hogar"
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear unidad familiar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
