/**
 * useTaskAutofillForm — orquesta el DICTADO por voz del formulario "Nueva tarea"
 * para las 4 vistas (mismo cableado, distinta estética).
 *
 * Combina voz (`useVoiceRecognition`, Web Speech `es-ES`) con la IA
 * (`useTaskAutofill`): al recibir el transcript final llama a la IA y vuelca los
 * campos que devuelva (título, descripción, fecha recomendada, fecha límite).
 *
 * A diferencia de planes, aquí NO hay geocoding ni threading por el container:
 * el estado del formulario vive en el propio diálogo, así que este hook se
 * instancia directamente en la vista con los setters locales. Las fechas llegan
 * ya en `YYYY-MM-DD` (el formato del input `type="date"`), sin conversión.
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useVoiceRecognition } from '@/shared/hooks/useVoiceRecognition';
import { useTaskAutofill } from './useTaskAutofill';
import type { TaskAutofillResult } from './useTaskAutofill';

/** Setters del estado local del formulario que el dictado puede rellenar. */
export interface TaskAutofillSetters {
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setRecommendedDate: (v: string) => void;
  setDeadlineDate: (v: string) => void;
}

export interface UseTaskAutofillFormReturn {
  /** La Web Speech API está disponible en este navegador. */
  voiceSupported: boolean;
  /** `true` mientras se escucha o se procesa (voz o IA). */
  isBusy: boolean;
  /** Texto parcial del reconocimiento de voz (feedback en vivo). */
  voiceInterim: string;
  /** Inicia la captura de voz. */
  startVoice: () => void;
  /** Detiene la captura de voz. */
  stopVoice: () => void;
}

export function useTaskAutofillForm(setters: TaskAutofillSetters): UseTaskAutofillFormReturn {
  const { autofill, isAutofilling } = useTaskAutofill();
  const [isApplying, setIsApplying] = useState(false);

  /** Vuelca en el formulario cada campo que la IA haya deducido. */
  const applyResult = useCallback(
    (result: TaskAutofillResult) => {
      if (result.title) setters.setTitle(result.title);
      if (result.description) setters.setDescription(result.description);
      if (result.recommendedDate) setters.setRecommendedDate(result.recommendedDate);
      if (result.deadlineDate) setters.setDeadlineDate(result.deadlineDate);
    },
    [setters],
  );

  // ── Voz → IA → volcado ──────────────────────────────────────────────────────
  const handleTranscript = useCallback(
    async (transcript: string) => {
      setIsApplying(true);
      try {
        const result = await autofill(transcript);
        applyResult(result);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se ha podido dictar la tarea.');
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

  const isBusy =
    voiceState === 'listening' || voiceState === 'processing' || isAutofilling || isApplying;

  return { voiceSupported, isBusy, voiceInterim, startVoice, stopVoice };
}
