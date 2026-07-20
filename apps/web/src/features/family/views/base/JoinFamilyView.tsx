/* ─── Vista presentacional base — family_join ───────────────────────────────
 *
 * Theme `base` (estética shadcn del kit de Lovable). Formulario para unirse a
 * una familia con un PIN de 8 caracteres (Base32 Crockford).
 *
 * Reparto de responsabilidades (plan §4, fila 5):
 *  - La VISTA sanitiza el input para mostrarlo (uppercase, filtra caracteres no
 *    base32, recorta a 8), lleva el contador, deshabilita el botón hasta tener
 *    8 caracteres y valida la longitud local antes de emitir.
 *  - El CONTAINER valida el formato Crockford definitivo y traduce los errores
 *    de negocio (`friendlyJoinError`: 404/410/409) que llegan por `error`.
 *
 * Presentacional puro: solo props in / callbacks out.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import { JOIN_PIN_LENGTH } from '@cosasdecasa/contracts';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import type { JoinFamilyViewProps } from '../types';

export default function JoinFamilyView(props: JoinFamilyViewProps) {
  const { isSubmitting, error, onSubmit, onBack } = props;

  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const displayedError = localError ?? error ?? null;

  function handlePinChange(value: string) {
    // Solo mayúsculas; elimina caracteres no válidos; recorta a la longitud PIN.
    setPin(value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, JOIN_PIN_LENGTH));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (pin.length !== JOIN_PIN_LENGTH) {
      setLocalError(`El PIN debe tener ${JOIN_PIN_LENGTH} caracteres.`);
      return;
    }

    onSubmit(pin);
  }

  return (
    <div className="min-h-[80dvh] grid place-items-center px-4">
      <div className="w-full max-w-[440px] bg-card text-card-foreground rounded-card shadow-lg border border-border p-8 space-y-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2 h-8 self-start px-2 text-muted-foreground"
        >
          ← Volver
        </Button>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Únete con un PIN</h2>
          <p className="text-sm text-muted-foreground">
            Introduce el PIN de {JOIN_PIN_LENGTH} caracteres que te ha compartido el
            propietario de la unidad familiar.
          </p>
        </div>

        {displayedError && (
          <Alert variant="destructive">
            <AlertDescription>{displayedError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
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
              maxLength={JOIN_PIN_LENGTH}
              disabled={isSubmitting}
              aria-describedby="pin-hint"
              className="h-14 text-center font-mono text-2xl tracking-[0.25em]"
            />
            <p id="pin-hint" className="text-xs text-muted-foreground text-right">
              {pin.length}/{JOIN_PIN_LENGTH} caracteres
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-11"
            disabled={isSubmitting || pin.length !== JOIN_PIN_LENGTH}
          >
            {isSubmitting ? 'Uniéndose…' : 'Unirse a la familia'}
          </Button>
        </form>
      </div>
    </div>
  );
}
