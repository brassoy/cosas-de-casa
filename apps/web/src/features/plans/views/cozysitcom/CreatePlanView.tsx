/**
 * CreatePlanView — vista presentacional `cozysitcom` (sitcom retro 70s) del
 * formulario de plan.
 *
 * Misma funcionalidad y contrato que la vista base (`CreatePlanViewProps`): el
 * estado del formulario (título, descripción, fecha, lugar guardado/manual,
 * guardar lugar) y el `handleSubmit` que resuelve `place` + `savePlace` son
 * idénticos; solo cambia la estética. Reproduce el look del kit estático:
 * fondo de papel pintado, marco de papel crema, inputs `.cz-input`, toggle de
 * lugar guardado con `<select>` nativo estilado y botón granate "Publicar".
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
    <div className="cz cz-wallpaper -mx-5 -my-6 px-5 py-6 min-h-full">
      {/* ── Cabecera de madera + cinta ─────────────────────────────────────── */}
      <div className="mb-5 cz-pop">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold mb-2 opacity-70 cursor-pointer"
        >
          ← Planes
        </button>
        <div className="cz-wood inline-block mb-2">
          <p className="cz-serif text-base">Nuevo plan</p>
        </div>
        <h1 className="cz-serif text-4xl leading-none">Vamos a tramar algo</h1>
        <div className="cz-stripe mt-3" />
      </div>

      {error && (
        <div
          className="cz-frame mb-3 cz-pop"
          role="alert"
          style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
        >
          <p className="font-bold text-sm">{error}</p>
        </div>
      )}

      <div className="cz-frame space-y-3 cz-pop">
        <div className="space-y-1.5">
          <label htmlFor="plan-title" className="text-xs font-bold uppercase opacity-70">
            Título *
          </label>
          <input
            id="plan-title"
            className="cz-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Barbacoa en el jardín"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="plan-description" className="text-xs font-bold uppercase opacity-70">
            Descripción
          </label>
          <textarea
            id="plan-description"
            className="cz-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="plan-scheduled-at" className="text-xs font-bold uppercase opacity-70">
            Cuándo
          </label>
          <input
            id="plan-scheduled-at"
            className="cz-input"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        {/* ── Lugar (toggle guardado/manual) ───────────────────────────────── */}
        <fieldset className="space-y-3 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
          <legend className="cz-serif text-lg">Lugar</legend>

          {savedPlaces.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="plan-saved-place" className="text-xs font-bold uppercase opacity-70">
                Lugar guardado
              </label>
              <select
                id="plan-saved-place"
                className="cz-input"
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
                <label htmlFor="place-name" className="text-xs font-bold uppercase opacity-70">
                  Nombre
                </label>
                <input
                  id="place-name"
                  className="cz-input"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder="p. ej. Casa de los abuelos"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="place-address" className="text-xs font-bold uppercase opacity-70">
                  Dirección
                </label>
                <input
                  id="place-address"
                  className="cz-input"
                  value={placeAddress}
                  onChange={(e) => setPlaceAddress(e.target.value)}
                />
              </div>
              {placeName.trim() && (
                <button
                  type="button"
                  onClick={() => setSavePlace((v) => !v)}
                  className="flex items-center gap-2 text-sm cursor-pointer min-h-[36px]"
                  aria-pressed={savePlace}
                >
                  <span className={`cz-check ${savePlace ? 'on' : ''}`} aria-hidden />
                  Guardar este lugar
                </button>
              )}
            </>
          )}

          {!useSaved && hasGoogleMapsApiKey ? (
            <div className="space-y-1.5">
              <label htmlFor="place-search" className="text-xs font-bold uppercase opacity-70">
                Busca en el mapa
              </label>
              <PlacePicker
                inputClassName="cz-input"
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
              <p className="text-xs opacity-70">
                Configura <code>VITE_GOOGLE_MAPS_API_KEY</code> para el mapa.
              </p>
            )
          )}
        </fieldset>

        <button
          type="button"
          className="cz-btn-garnet w-full"
          disabled={!title.trim() || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
    </div>
  );
}
