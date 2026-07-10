/**
 * ConfirmDialog — diálogo de confirmación reutilizable (sustituto de
 * `window.confirm` para acciones sensibles/destructivas).
 *
 * CONTROLADO: el estado `open` vive en el container que lo usa. Radix gestiona
 * foco, Escape y click fuera; cualquier cierre que no sea el botón de confirmar
 * (Escape, overlay, la X) emite `onCancel`.
 *
 * Componente neutro (como `ScreenState`): estética shadcn del kit base, válida
 * bajo cualquier theme activo.
 */

import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

export interface ConfirmDialogProps {
  /** El diálogo está abierto (controlado por el container). */
  open: boolean;
  /** Título de la confirmación (pregunta directa). */
  title: string;
  /** Explicación de las consecuencias de confirmar. */
  description?: string;
  /** Texto del botón de confirmar (por defecto "Confirmar"). */
  confirmLabel?: string;
  /** Texto del botón de cancelar (por defecto "Cancelar"). */
  cancelLabel?: string;
  /** La acción es destructiva: el botón de confirmar se pinta en rojo. */
  destructive?: boolean;
  /** Confirmación explícita del usuario. */
  onConfirm: () => void;
  /** Cancelación (botón, Escape, overlay o la X del diálogo). */
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel} className="h-11">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            className="h-11"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
