/**
 * usePlanAutofill — autocompletado del formulario de plan con IA.
 *
 * Flujo voz/texto → IA → geocoding:
 *  1. `autofill(phrase)` llama a `POST /ai/parse-plan` con el texto y el `now`
 *     actual (la IA resuelve expresiones relativas como "en dos horas").
 *  2. Si la IA devuelve `placeQuery` (texto buscable en mapas), lo geocodifica
 *     en el cliente con Google Maps (`google.maps.Geocoder`) a coordenadas reales,
 *     SIN que el usuario confirme.
 *
 * Degradación graciosa (ADR 0014 + sin key de Maps):
 *  - Sin `VITE_GOOGLE_MAPS_API_KEY` o sin SDK cargado → devuelve el lugar como
 *    `{ name: placeQuery }` sin coordenadas (la dirección manual sigue disponible).
 *  - 503 de la IA → lanza un error con mensaje legible en español.
 *
 * Nota de arquitectura (APIProvider): `google.maps.Geocoder` necesita que el SDK
 * de Google esté cargado. NO usamos `useMapsLibrary` (requiere el contexto React
 * de `<APIProvider>`): cargamos la librería de forma imperativa con
 * `google.maps.importLibrary('geocoding')`, que el `<APIProvider>` del PlacePicker
 * ya deja disponible en el `window.google` global cuando hay key. Así evitamos
 * montar un segundo `<APIProvider>` que entre en conflicto con el del PlacePicker.
 */

import { useCallback, useState } from 'react';
import { api, ApiRequestError } from '@/shared/lib/api';
import type { ParsePlanResponse } from '@cosasdecasa/contracts';

/** Lugar resuelto por el autofill. `address`/`lat`/`lng` solo si Google los aporta. */
export interface AutofillPlace {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

/** Resultado del autofill: cada campo presente solo si la IA lo dedujo. */
export interface AutofillResult {
  title?: string;
  description?: string;
  /** Fecha/hora en ISO 8601. */
  scheduledAt?: string;
  place?: AutofillPlace;
}

export interface UsePlanAutofillReturn {
  /** Lanza el autocompletado a partir de una frase en lenguaje natural. */
  autofill: (phrase: string) => Promise<AutofillResult>;
  /** El autocompletado está en curso. */
  isAutofilling: boolean;
  /** Mensaje de error legible del último intento, o `null`. */
  autofillError: string | null;
}

const GOOGLE_MAPS_API_KEY = (
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
)?.trim();

/** SDK de Google Maps mínimamente tipado para el acceso imperativo. */
type GoogleMapsGlobal = {
  maps?: {
    importLibrary?: (name: string) => Promise<unknown>;
    Geocoder?: new () => google.maps.Geocoder;
  };
};

/**
 * Geocodifica una consulta de lugar a `{ name, address, lat, lng }` con Google.
 * Devuelve `null` si el SDK no está disponible o la consulta no resuelve, para
 * que el llamador degrade a `{ name: placeQuery }` sin coordenadas.
 */
async function geocodePlaceQuery(query: string): Promise<AutofillPlace | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  const g = (window as unknown as { google?: GoogleMapsGlobal }).google;
  if (!g?.maps) return null;

  try {
    // Carga la librería de geocoding si el APIProvider del PlacePicker aún no la
    // cargó (idempotente: importLibrary deduplica). Si no existe, no hay SDK.
    if (typeof g.maps.importLibrary === 'function') {
      await g.maps.importLibrary('geocoding');
    }

    const GeocoderCtor = (
      window as unknown as { google?: GoogleMapsGlobal }
    ).google?.maps?.Geocoder;
    if (!GeocoderCtor) return null;

    const geocoder = new GeocoderCtor();
    const { results } = await geocoder.geocode({ address: query });
    const first = results?.[0];
    if (!first) return null;

    const location = first.geometry?.location;
    return {
      name: query,
      address: first.formatted_address ?? undefined,
      lat: location ? location.lat() : undefined,
      lng: location ? location.lng() : undefined,
    };
  } catch {
    // Geocoding fallido (ZERO_RESULTS, error de red, cuota…): degradamos.
    return null;
  }
}

export function usePlanAutofill(): UsePlanAutofillReturn {
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);

  const autofill = useCallback(async (phrase: string): Promise<AutofillResult> => {
    const trimmed = phrase.trim();
    if (!trimmed) return {};

    setAutofillError(null);
    setIsAutofilling(true);
    try {
      const parsed = await api.post<ParsePlanResponse>('/ai/parse-plan', {
        phrase: trimmed,
        now: new Date().toISOString(),
      });

      const result: AutofillResult = {};
      if (parsed.title) result.title = parsed.title;
      if (parsed.description) result.description = parsed.description;
      if (parsed.scheduledAt) result.scheduledAt = parsed.scheduledAt;

      if (parsed.placeQuery) {
        const geocoded = await geocodePlaceQuery(parsed.placeQuery);
        // Si el geocoding no resuelve, al menos devolvemos el nombre del lugar.
        result.place = geocoded ?? { name: parsed.placeQuery };
      }

      return result;
    } catch (err) {
      const message =
        err instanceof ApiRequestError && err.status === 503
          ? 'La IA no está disponible ahora mismo. Inténtalo de nuevo más tarde.'
          : 'No se ha podido autocompletar el plan. Inténtalo de nuevo.';
      setAutofillError(message);
      throw new Error(message);
    } finally {
      setIsAutofilling(false);
    }
  }, []);

  return { autofill, isAutofilling, autofillError };
}
