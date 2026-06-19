/**
 * CreatePlanView — vista presentacional `cozy` (cuaderno manuscrito) del formulario
 * de plan.
 *
 * Misma funcionalidad y contrato que la vista base (`CreatePlanViewProps`): el
 * estado del formulario (título, descripción, fecha, lugar guardado/manual,
 * guardar lugar) y el `handleSubmit` que resuelve `place` + `savePlace` son
 * idénticos; solo cambia la estética. Reproduce el look del kit estático: fondo de
 * papel pautado, nota de papel sujeta con cinta, labels manuscritos (Caveat),
 * campos `.ck-input` con línea inferior de puntos, casilla `.ck-check` y botón azul
 * de boli "Guardar".
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
    <div className="ck ck-page -mx-5 -my-6 px-5 py-6 min-h-full">
      {/* ── Cabecera del cuaderno ──────────────────────────────────────────── */}
      <div className="text-center mb-6 relative">
        <button
          type="button"
          onClick={onCancel}
          className="absolute left-0 top-0 ck-marker text-xl cursor-pointer"
          style={{ color: 'var(--color-accent)' }}
        >
          ← volver
        </button>
        <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
        <h1
          className="ck-marker text-5xl leading-none mt-1"
          style={{ color: 'var(--color-accent)' }}
        >
          Nuevo plan
        </h1>
        <p className="text-base mt-2 opacity-80">Apunta algo divertido</p>
      </div>

      {error && (
        <div
          className="ck-card p-3 mb-4"
          role="alert"
          style={{ borderColor: 'var(--color-error)' }}
        >
          <p className="ck-marker text-xl" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        </div>
      )}

      <div className="ck-card p-5 space-y-4">
        <span className="ck-tape" aria-hidden />

        <div>
          <label htmlFor="plan-title" className="ck-marker text-xl block">
            título *
          </label>
          <input
            id="plan-title"
            className="ck-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="paseo por el parque"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="plan-description" className="ck-marker text-xl block">
            notas
          </label>
          <textarea
            id="plan-description"
            className="ck-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <label htmlFor="plan-scheduled-at" className="ck-marker text-xl block">
            cuándo
          </label>
          <input
            id="plan-scheduled-at"
            className="ck-input"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        {/* ── Lugar (toggle guardado/manual) ───────────────────────────────── */}
        <fieldset
          className="space-y-4 border-t border-dashed pt-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <legend className="ck-marker text-2xl" style={{ color: 'var(--color-accent)' }}>
            dónde
          </legend>

          {savedPlaces.length > 0 && (
            <div>
              <label htmlFor="plan-saved-place" className="ck-marker text-xl block">
                lugar guardado
              </label>
              <select
                id="plan-saved-place"
                className="ck-input"
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
              <div>
                <label htmlFor="place-name" className="ck-marker text-xl block">
                  nombre
                </label>
                <input
                  id="place-name"
                  className="ck-input"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder="p. ej. Parque del Retiro"
                />
              </div>
              <div>
                <label htmlFor="place-address" className="ck-marker text-xl block">
                  dirección
                </label>
                <input
                  id="place-address"
                  className="ck-input"
                  value={placeAddress}
                  onChange={(e) => setPlaceAddress(e.target.value)}
                />
              </div>
              {placeName.trim() && (
                <button
                  type="button"
                  onClick={() => setSavePlace((v) => !v)}
                  className="flex items-center gap-2 text-base cursor-pointer min-h-[36px]"
                  aria-pressed={savePlace}
                >
                  <span className={`ck-check ${savePlace ? 'on' : ''}`} aria-hidden>
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
                  guardar este lugar
                </button>
              )}
            </>
          )}

          {!useSaved && hasGoogleMapsApiKey ? (
            <div>
              <label htmlFor="place-search" className="ck-marker text-xl block">
                busca en el mapa
              </label>
              <PlacePicker
                inputClassName="ck-input"
                placeholder="busca un lugar…"
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
              <p className="text-sm opacity-70">
                Configura <code>VITE_GOOGLE_MAPS_API_KEY</code> para el mapa.
              </p>
            )
          )}
        </fieldset>

        <button
          type="button"
          className="ck-btn ck-btn-blue w-full"
          disabled={!title.trim() || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Creando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
