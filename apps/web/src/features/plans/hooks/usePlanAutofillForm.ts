/**
 * usePlanAutofillForm — orquesta el autocompletado del formulario "Nuevo plan"
 * para las 4 vistas (mismo cableado, distinta estética).
 *
 * Combina:
 *  - Voz (`useVoiceRecognition`, Web Speech `es-ES`): al recibir el transcript
 *    final llama a la IA y vuelca TODOS los campos que devuelva.
 *  - "Autocompletar desde la descripción": llama a la IA con el texto de la
 *    descripción y rellena lo que falte; el lugar SOLO se fija si no estaba ya
 *    fijado (placeName/placeAddress vacíos).
 *
 * La vista solo aporta los setters de su estado local; este hook decide qué
 * aplicar. Errores y estado de carga se exponen para que la vista los pinte.
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useVoiceRecognition } from '@/shared/hooks/useVoiceRecognition';
import { toDatetimeLocal } from '../views/planDetail.helpers';
import type { AutofillResult } from './usePlanAutofill';

/** Setters del estado local del formulario que el autofill puede tocar. */
export interface PlanAutofillSetters {
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  /** Recibe el valor para el input `datetime-local` (ya convertido). */
  setScheduledAt: (v: string) => void;
  setPlaceName: (v: string) => void;
  setPlaceAddress: (v: string) => void;
  setPlaceLat: (v: number | undefined) => void;
  setPlaceLng: (v: number | undefined) => void;
}

/**
 * Parámetros del hook: los setters del formulario (estado en la VISTA) + la
 * función de autocompletado y su estado, que llegan del CONTAINER (es ahí donde
 * vive el fetch a la IA + geocoding; la vista se mantiene presentacional).
 */
export interface UsePlanAutofillFormParams extends PlanAutofillSetters {
  /** Llama a la IA y resuelve el lugar (lo inyecta el container). */
  autofill: (phrase: string) => Promise<AutofillResult>;
  /** El autocompletado por IA está en curso (lo aporta el container). */
  isAutofilling: boolean;
}

export interface UsePlanAutofillFormReturn {
  /** La Web Speech API está disponible en este navegador. */
  voiceSupported: boolean;
  /** `true` mientras se escucha o se procesa (voz o IA). */
  isBusy: boolean;
  /** Texto parcial del reconocimiento de voz (feedback en vivo). */
  voiceInterim: string;
  /** Inicia/detiene la captura de voz. */
  startVoice: () => void;
  stopVoice: () => void;
  /** Autocompleta a partir del texto de la descripción (no toca el lugar fijado). */
  autofillFromDescription: (description: string, placeAlreadySet: boolean) => void;
}

export function usePlanAutofillForm({
  autofill,
  isAutofilling,
  ...setters
}: UsePlanAutofillFormParams): UsePlanAutofillFormReturn {
  const [isApplying, setIsApplying] = useState(false);

  /** Vuelca el resultado de la IA en el formulario.
   *  `keepPlaceIfSet`: si el lugar ya está fijado, NO lo sobrescribe. */
  const applyResult = useCallback(
    (result: AutofillResult, keepPlaceIfSet: boolean) => {
      if (result.title) setters.setTitle(result.title);
      if (result.description) setters.setDescription(result.description);
      if (result.scheduledAt) {
        setters.setScheduledAt(toDatetimeLocal(result.scheduledAt));
      }
      if (result.place && !keepPlaceIfSet) {
        setters.setPlaceName(result.place.name);
        setters.setPlaceAddress(result.place.address ?? '');
        setters.setPlaceLat(result.place.lat);
        setters.setPlaceLng(result.place.lng);
      }
    },
    [setters],
  );

  // ── Voz → IA → volcado completo ────────────────────────────────────────────
  const handleTranscript = useCallback(
    async (transcript: string) => {
      setIsApplying(true);
      try {
        const result = await autofill(transcript);
        applyResult(result, /* keepPlaceIfSet */ false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se ha podido autocompletar.');
      } finally {
        setIsApplying(false);
      }
    },
    [autofill, applyResult],
  );

  const {
    supported: voiceSupported,
    state: voiceState,
    interimTranscript: voiceInterim,
    start: startVoice,
    stop: stopVoice,
    errorMessage: voiceError,
  } = useVoiceRecognition(handleTranscript);

  // Refleja el error del reconocimiento de voz (permiso, sin conexión…) como
  // toast amable, una sola vez por mensaje nuevo.
  const [lastVoiceError, setLastVoiceError] = useState<string | null>(null);
  if (voiceError && voiceError !== lastVoiceError) {
    setLastVoiceError(voiceError);
    toast.error(voiceError);
  }

  // ── Descripción → IA → rellena lo que falte (sin pisar el lugar fijado) ────
  const autofillFromDescription = useCallback(
    (description: string, placeAlreadySet: boolean) => {
      const text = description.trim();
      if (!text) {
        toast.message('Escribe algo en la descripción para que la IA pueda completar el plan.');
        return;
      }
      setIsApplying(true);
      void (async () => {
        try {
          const result = await autofill(text);
          applyResult(result, /* keepPlaceIfSet */ placeAlreadySet);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'No se ha podido autocompletar.');
        } finally {
          setIsApplying(false);
        }
      })();
    },
    [autofill, applyResult],
  );

  const isBusy = voiceState === 'listening' || voiceState === 'processing' || isAutofilling || isApplying;

  return {
    voiceSupported,
    isBusy,
    voiceInterim,
    startVoice,
    stopVoice,
    autofillFromDescription,
  };
}
