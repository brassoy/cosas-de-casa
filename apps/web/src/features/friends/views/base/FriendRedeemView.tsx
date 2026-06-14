/**
 * FriendRedeemView — vista presentacional `base` (shadcn) de "Canjear código".
 *
 * NO hay componente base del kit de Lovable para friends_redeem: esta vista
 * define la referencia estética (coherente con el resto) a partir del contrato
 * real. Presentacional pura: solo props in / callbacks out. El container
 * (`RedeemFriendPage`) posee familyId (del store), la mutación de canje, la
 * validación y la navegación.
 *
 * Se conservan los nombres accesibles y textos que la suite espera: heading
 * "Canjear código de amistad", label "Código de invitación" ligado al input,
 * botón "Canjear código" y `role="alert"` para los errores.
 */

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import type { FriendRedeemViewProps } from '../types';

export default function FriendRedeemView({
  code,
  familyName,
  error,
  isSubmitting,
  onCodeChange,
  onSubmit,
  onBack,
}: FriendRedeemViewProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6">
      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <Button
          variant="link"
          onClick={onBack}
          aria-label="Volver a familias amigas"
          className="h-auto w-fit gap-1 p-0 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Familias amigas
        </Button>
        <h2 className="text-2xl font-bold">Canjear código de amistad</h2>
      </header>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Introduce el código que te ha compartido otra familia para conectaros en{' '}
        <strong className="text-foreground">{familyName ?? 'tu familia'}</strong>.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Label htmlFor="friend-code">Código de invitación</Label>
        <Input
          id="friend-code"
          type="text"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder="p. ej. ABC123XY"
          autoComplete="off"
          autoFocus
          className="font-mono tracking-[0.1em]"
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Canjeando…' : 'Canjear código'}
        </Button>
      </form>
    </div>
  );
}
