/**
 * Hook para captura de voz usando la Web Speech API nativa.
 *
 * Sólo funciona online (el extracto de ítems requiere la IA del backend).
 * Si el navegador no soporta la API o el usuario está offline, el hook
 * devuelve `supported: false` para que la UI lo refleje con un fallback claro.
 */

import { useState, useRef, useCallback } from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export interface UseVoiceRecognitionReturn {
  /** La Web Speech API está disponible en este navegador. */
  supported: boolean;
  state: VoiceState;
  /** Texto interim (parcial, en tiempo real) para feedback visual. */
  interimTranscript: string;
  /** Inicia el reconocimiento de voz. */
  start: () => void;
  /** Detiene el reconocimiento manualmente. */
  stop: () => void;
  /** Mensaje de error legible, si hay alguno. */
  errorMessage: string | null;
}

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition ??
    null
  );
}

export function useVoiceRecognition(
  onFinalTranscript: (transcript: string) => void,
): UseVoiceRecognitionReturn {
  const SpeechRecognition = getSpeechRecognition();
  const supported = SpeechRecognition !== null;

  const [state, setState] = useState<VoiceState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const start = useCallback(() => {
    if (!SpeechRecognition) return;

    if (!navigator.onLine) {
      setErrorMessage('Sin conexión. La captura de voz requiere internet.');
      setState('error');
      return;
    }

    setErrorMessage(null);
    setInterimTranscript('');

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result) continue;
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);

      if (final.trim()) {
        setState('processing');
        setInterimTranscript('');
        onFinalTranscript(final.trim());
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      const msg = e.error === 'not-allowed'
        ? 'Permiso de micrófono denegado. Habilítalo en la configuración del navegador.'
        : e.error === 'no-speech'
          ? 'No se detectó voz. Inténtalo de nuevo.'
          : `Error de reconocimiento: ${e.error}`;
      setErrorMessage(msg);
      setState('error');
    };

    recognition.onend = () => {
      if (state !== 'processing') {
        setState('idle');
      }
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState('listening');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SpeechRecognition, onFinalTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState('idle');
    setInterimTranscript('');
  }, []);

  return { supported, state, interimTranscript, start, stop, errorMessage };
}
