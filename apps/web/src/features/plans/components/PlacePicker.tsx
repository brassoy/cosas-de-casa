/**
 * PlacePicker — selector de lugar con Google Maps (compartido por los 4 themes).
 *
 * Componente "tonto" pero con una pizca de integración: recibe el valor actual
 * del lugar (`value`) y emite cambios (`onChange`) hacia la vista presentacional,
 * que a su vez los cablea al formulario. No conoce el plan ni hace fetch: solo
 * resuelve un lugar de Google Places a `{ name, address, lat, lng }`.
 *
 * Integración con `@vis.gl/react-google-maps` (v1.8.3):
 *  - `<APIProvider apiKey={...}>` carga el SDK de Google Maps por nosotros; NO se
 *    inyecta ningún `<script>` a mano.
 *  - Búsqueda con autocompletado mediante el `Autocomplete` clásico de Places
 *    (`google.maps.places.Autocomplete`), obtenido vía `useMapsLibrary('places')`
 *    y enganchado a un `<input>` real. Al elegir un resultado, su evento
 *    `place_changed` nos da un `PlaceResult` del que extraemos nombre, dirección
 *    y coordenadas.
 *  - `<Map>` pequeño de preview con un `<Marker>` (legacy, no requiere `mapId`)
 *    sobre el lugar seleccionado.
 *
 * Degradación graciosa: si no hay `VITE_GOOGLE_MAPS_API_KEY`, NO se monta el
 * `APIProvider` ni el mapa (evita el error de "API key vacía"). En su lugar se
 * pinta una nota discreta y se confía en los inputs manuales que ya viven en la
 * vista. La presencia de la key se expone por `hasGoogleMapsApiKey` para que la
 * vista decida si sigue mostrando los inputs manuales (sin key) o los oculta
 * (con key, el buscador los sustituye).
 */

import { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, Marker, useMapsLibrary } from '@vis.gl/react-google-maps';

/** Lugar resuelto por el selector. `lat`/`lng` solo si Places los aporta. */
export interface PickedPlace {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

/** La key del cliente está configurada (vía `import.meta.env`). */
export const hasGoogleMapsApiKey = Boolean(
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim(),
);

const GOOGLE_MAPS_API_KEY = (
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
)?.trim();

interface PlacePickerProps {
  /** Lugar seleccionado actualmente (controlado desde la vista). */
  value?: PickedPlace | null;
  /** Emite el lugar elegido en Places (o `null` al limpiar la búsqueda). */
  onChange: (place: PickedPlace | null) => void;
  /** Clase del contenedor (cada theme aporta su estética). */
  className?: string;
  /** Clase del `<input>` de búsqueda (estética del theme). */
  inputClassName?: string;
  /** Texto del placeholder del buscador. */
  placeholder?: string;
}

/**
 * Buscador + mapa. Solo se monta DENTRO de `<APIProvider>`, así que aquí ya
 * podemos usar `useMapsLibrary`.
 */
function PlacePickerInner({
  value,
  onChange,
  inputClassName,
  placeholder,
}: Omit<PlacePickerProps, 'className'>) {
  const places = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const autocomplete = new places.Autocomplete(inputRef.current, {
      // Solo pedimos lo que guardamos: nombre, dirección y geometría (lat/lng).
      fields: ['name', 'formatted_address', 'geometry.location'],
    });
    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const name = place.name ?? place.formatted_address;
      if (!name) return; // Sin nombre/dirección no hay lugar utilizable.

      const location = place.geometry?.location;
      onChange({
        name,
        address: place.formatted_address ?? undefined,
        lat: location ? location.lat() : undefined,
        lng: location ? location.lng() : undefined,
      });
    });

    return () => {
      listener.remove();
      // Limpia el dropdown `.pac-container` que Google inyecta en <body>.
      google.maps.event.clearInstanceListeners(autocomplete);
    };
    // `onChange` se asume estable (callback de la vista); no lo incluimos para
    // no recrear el Autocomplete en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  const hasCoords =
    typeof value?.lat === 'number' && typeof value?.lng === 'number';
  const center = hasCoords
    ? { lat: value!.lat as number, lng: value!.lng as number }
    : { lat: 40.4168, lng: -3.7038 }; // Madrid por defecto.

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="text"
        defaultValue={value?.name ?? ''}
        placeholder={placeholder ?? 'Busca un lugar…'}
        className={inputClassName}
        aria-label="Buscar lugar en el mapa"
      />
      <div className="overflow-hidden rounded-card">
        <Map
          style={{ width: '100%', height: '12rem' }}
          defaultCenter={center}
          defaultZoom={hasCoords ? 15 : 11}
          gestureHandling="cooperative"
          disableDefaultUI
        >
          {hasCoords && <Marker position={center} />}
        </Map>
      </div>
    </div>
  );
}

/**
 * PlacePicker. Cuando hay key, envuelve el buscador+mapa en `<APIProvider>`.
 * Sin key, no renderiza nada del mapa (la vista mantiene los inputs manuales).
 */
export default function PlacePicker({ className, ...inner }: PlacePickerProps) {
  // Render del cliente: en SSR/tests sin key no montamos nada de Google.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount flag para evitar SSR/tests sin Google
  useEffect(() => setMounted(true), []);

  if (!hasGoogleMapsApiKey || !GOOGLE_MAPS_API_KEY) {
    return null;
  }

  return (
    <div className={className}>
      {mounted && (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <PlacePickerInner {...inner} />
        </APIProvider>
      )}
    </div>
  );
}
