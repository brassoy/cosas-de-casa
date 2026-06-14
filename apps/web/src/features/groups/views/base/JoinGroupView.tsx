/**
 * JoinGroupView — vista presentacional `base` (shadcn) de unirse con PIN.
 *
 * Mismo patrón que `AuthView`: el input controlado, la sanitización del PIN
 * (uppercase, filtro a base32 Crockford, recorte a 8) y la validación de UI viven
 * en la vista. El container ejecuta la mutación, navega y mapea el error de
 * negocio (`friendlyJoinError` 404/410/409), que llega por la prop `error`.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 */

import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card } from '@/shared/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { GROUP_PIN_LENGTH, GROUP_PIN_REGEX } from '../../contracts';
import type { JoinGroupViewProps } from '../types';

export default function JoinGroupView({ isSubmitting, error, onSubmit }: JoinGroupViewProps) {
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Prioriza la validación de UI; si no, el error de negocio del container.
  const displayedError = localError ?? error ?? null;

  function handlePinChange(value: string) {
    setPin(value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, GROUP_PIN_LENGTH));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (pin.length !== GROUP_PIN_LENGTH) {
      setLocalError(`El PIN debe tener ${GROUP_PIN_LENGTH} caracteres.`);
      return;
    }

    if (!GROUP_PIN_REGEX.test(pin)) {
      setLocalError(
        'El PIN contiene caracteres no válidos. Usa solo letras (sin I, L, O, U) y números.',
      );
      return;
    }

    onSubmit(pin);
  }

  return (
    <div className="grid min-h-[80dvh] place-items-center px-4">
      <Card className="w-full max-w-[440px] p-8">
        <h2 className="text-2xl font-bold">Únete con un PIN</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Introduce el PIN de 8 caracteres que te ha compartido el propietario de la peña.
        </p>

        {displayedError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{displayedError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="join-pin">PIN de invitación</Label>
            <Input
              id="join-pin"
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              required
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="XXXXXXXX"
              maxLength={GROUP_PIN_LENGTH}
              aria-describedby="pin-hint"
              disabled={isSubmitting}
              className="h-auto text-center font-mono text-2xl tracking-[0.25em]"
            />
            <p id="pin-hint" className="text-right text-xs text-muted-foreground">
              {pin.length}/{GROUP_PIN_LENGTH} caracteres
            </p>
          </div>

          <Button
            type="submit"
            className="mt-2 h-11 w-full"
            disabled={isSubmitting || pin.length !== GROUP_PIN_LENGTH}
          >
            {isSubmitting ? 'Uniéndose…' : 'Unirse a la peña'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
