/**
 * CreatePlanView — vista presentacional `springfield` (cómic pop) del formulario
 * de plan.
 *
 * Misma funcionalidad y contrato que la vista base (`CreatePlanViewProps`): el
 * estado del formulario (título, descripción, fecha, lugar guardado/manual,
 * guardar lugar) y el `handleSubmit` que resuelve `place` + `savePlace` son
 * idénticos; solo cambia la estética. Reproduce el look del kit estático: fondo
 * de puntos de cómic, cabecera celeste de viñeta, inputs `.sf-input`, toggle de
 * lugar guardado con `<select>` nativo estilado, casilla `.sf-check` y botón rojo
 * de cómic "¡Lánzalo!".
 *
 * Toggle saved/manual: la vista resuelve el lugar guardado seleccionado a
 * `{ name, address }` desde `savedPlaces` y lo emite junto con `savePlace`. El
 * container decide qué hacer con esos valores (crear plan + guardar lugar).
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación. Estado de UI local permitido.
 */

import { useState } from 'react';
import PlacePicker, { hasGoogleMapsApiKey } from '../../components/PlacePicker';
import type { PlanPlaceInput, CreatePlanViewProps } from '../types';

export default function CreatePlanView(props: CreatePlanViewProps) {
  const { savedPlaces, isSubmitting, error, onSubmit, onCancel } = props;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [useSaved, setUseSaved] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeLat, setPlaceLat] = useState<number | undefined>(undefined);
  const [placeLng, setPlaceLng] = useState<number | undefined>(undefined);
  const [savePlace, setSavePlace] = useState(false);

  function handleSubmit() {
    let place: PlanPlaceInput | undefined;
    if (useSaved) {
      const sp = savedPlaces.find((s) => s.id === useSaved);
      if (sp) place = { name: sp.name, address: sp.address, lat: sp.lat, lng: sp.lng };
    } else if (placeName.trim()) {
      place = {
        name: placeName.trim(),
        address: placeAddress.trim() || undefined,
        lat: placeLat,
        lng: placeLng,
      };
    }

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      scheduledAt: scheduledAt || undefined,
      place,
      // savePlace solo aplica a un lugar manual nuevo con nombre.
      savePlace: !useSaved && savePlace && Boolean(placeName.trim()),
    });
  }

  return (
    <div className="sf sf-dot -mx-5 -my-6 px-5 py-6 min-h-full">
      {/* ── Cabecera celeste de viñeta + pegatina ──────────────────────────── */}
      <div className="sf-card-s p-4 mb-5 relative sf-pop">
        <button
          type="button"
          onClick={onCancel}
          className="sf-sticker cursor-pointer"
          style={{ background: 'var(--color-surface-raised)' }}
        >
          ← Planes
        </button>
        <h1 className="sf-bangers text-4xl leading-none mt-2">Nuevo plan</h1>
        <p className="sf-fredoka text-sm mt-1">¡Inventa algo divertido!</p>
      </div>

      {error && (
        <div
          className="sf-card p-3 mb-4 sf-pop"
          role="alert"
          style={{ borderColor: 'var(--color-error)' }}
        >
          <p className="font-bold text-sm" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        </div>
      )}

      <div className="sf-card p-5 space-y-3 sf-pop">
        <div className="space-y-1.5">
          <label htmlFor="plan-title" className="sf-fredoka text-xs uppercase">
            Título *
          </label>
          <input
            id="plan-title"
            className="sf-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Barbacoa en el jardín"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="plan-description" className="sf-fredoka text-xs uppercase">
            Descripción
          </label>
          <textarea
            id="plan-description"
            className="sf-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="plan-scheduled-at" className="sf-fredoka text-xs uppercase">
            Cuándo
          </label>
          <input
            id="plan-scheduled-at"
            className="sf-input"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        {/* ── Lugar (toggle guardado/manual) ───────────────────────────────── */}
        <fieldset
          className="space-y-3 border-t pt-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <legend className="sf-bangers text-lg">Lugar</legend>

          {savedPlaces.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="plan-saved-place" className="sf-fredoka text-xs uppercase">
                Lugar guardado
              </label>
              <select
                id="plan-saved-place"
                className="sf-input"
                aria-label="Lugar guardado"
                value={useSaved}
                onChange={(e) => setUseSaved(e.target.value)}
              >
                <option value="">Elige uno o escribe abajo</option>
                {savedPlaces.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!useSaved && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="place-name" className="sf-fredoka text-xs uppercase">
                  Nombre
                </label>
                <input
                  id="place-name"
                  className="sf-input"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder="p. ej. Jardín de los abuelos"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="place-address" className="sf-fredoka text-xs uppercase">
                  Dirección
                </label>
                <input
                  id="place-address"
                  className="sf-input"
                  value={placeAddress}
                  onChange={(e) => setPlaceAddress(e.target.value)}
                />
              </div>
              {placeName.trim() && (
                <button
                  type="button"
                  onClick={() => setSavePlace((v) => !v)}
                  className="flex items-center gap-2 text-sm font-bold cursor-pointer min-h-[36px]"
                  aria-pressed={savePlace}
                >
                  <span className={`sf-check ${savePlace ? 'on' : ''}`} aria-hidden>
                    {savePlace && (
                      <svg viewBox="0 0 22 22" className="w-full h-full">
                        <path
                          d="M5 12 L9 16 L17 7"
                          stroke="#fff"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </span>
                  Guardar este lugar
                </button>
              )}
            </>
          )}

          {!useSaved && hasGoogleMapsApiKey ? (
            <div className="space-y-1.5">
              <label htmlFor="place-search" className="sf-fredoka text-xs uppercase">
                Busca en el mapa
              </label>
              <PlacePicker
                inputClassName="sf-input"
                placeholder="Busca un lugar…"
                value={
                  placeName
                    ? { name: placeName, address: placeAddress, lat: placeLat, lng: placeLng }
                    : null
                }
                onChange={(p) => {
                  setPlaceName(p?.name ?? '');
                  setPlaceAddress(p?.address ?? '');
                  setPlaceLat(p?.lat);
                  setPlaceLng(p?.lng);
                }}
              />
            </div>
          ) : (
            !useSaved && (
              <p className="text-xs font-semibold opacity-70">
                Configura <code>VITE_GOOGLE_MAPS_API_KEY</code> para el mapa.
              </p>
            )
          )}
        </fieldset>

        <button
          type="button"
          className="sf-btn sf-btn-r w-full text-lg"
          disabled={!title.trim() || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Creando…' : '¡Lánzalo!'}
        </button>
      </div>
    </div>
  );
}
