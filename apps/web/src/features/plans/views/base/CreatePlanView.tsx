/**
 * CreatePlanView — vista presentacional `base` (shadcn) del formulario de plan.
 *
 * Porta el JSX del componente base del kit (Lovable `CreatePlanPage`) a las
 * primitivas shadcn de `@/shared/ui/*`, reconciliando los tipos con `SavedPlaceDto`
 * real. El estado del formulario (título, descripción, fecha, lugar) es estado de
 * UI presentacional y vive en la vista; al enviar emite los valores resueltos.
 *
 * Toggle saved/manual: la vista resuelve el lugar guardado seleccionado a
 * `{ name, address }` desde `savedPlaces` y lo emite junto con `savePlace`. El
 * container decide qué hacer con esos valores (crear plan + guardar lugar).
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación.
 */

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Checkbox } from '@/shared/ui/checkbox';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import PlacePicker, { hasGoogleMapsApiKey } from '../../components/PlacePicker';
import { usePlanAutofillForm } from '../../hooks/usePlanAutofillForm';
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

  const autofill = usePlanAutofillForm({
    setTitle,
    setDescription,
    setScheduledAt,
    setPlaceName,
    setPlaceAddress,
    setPlaceLat,
    setPlaceLng,
    autofill: props.onAutofill,
    isAutofilling: props.isAutofilling,
  });
  const placeAlreadySet = Boolean(placeName.trim() || placeAddress.trim());

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
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <button type="button" onClick={onCancel} className="text-sm text-muted-foreground cursor-pointer">
        ‹ Planes
      </button>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Nuevo plan</h1>
        {autofill.voiceSupported && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={autofill.isBusy}
            onClick={autofill.startVoice}
            aria-label="Rellenar el plan hablando"
            title="Habla y la IA rellena el plan"
          >
            {autofill.isBusy ? '…' : '🎤'} Hablar
          </Button>
        )}
      </div>
      {autofill.voiceInterim && (
        <p className="text-xs text-muted-foreground italic">{autofill.voiceInterim}</p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="plan-title">Título *</Label>
          <Input
            id="plan-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Cañas en La Latina"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="plan-description">Descripción</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={autofill.isBusy || !description.trim()}
              onClick={() => autofill.autofillFromDescription(description, placeAlreadySet)}
              title="La IA completa lo que falte a partir de la descripción"
            >
              ✨ Autocompletar
            </Button>
          </div>
          <Textarea
            id="plan-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="plan-scheduled-at">Cuándo</Label>
          <Input
            id="plan-scheduled-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        <fieldset className="space-y-3 p-3 rounded-card border border-border">
          <legend className="text-sm font-medium px-1">Lugar</legend>

          {savedPlaces.length > 0 && (
            <div className="space-y-1.5">
              <Label>Lugar guardado</Label>
              <Select value={useSaved} onValueChange={setUseSaved}>
                <SelectTrigger aria-label="Lugar guardado">
                  <SelectValue placeholder="Elige uno o escribe abajo" />
                </SelectTrigger>
                <SelectContent>
                  {savedPlaces.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!useSaved && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="place-name">Nombre</Label>
                <Input
                  id="place-name"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder="p. ej. Parque del Retiro"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="place-address">Dirección</Label>
                <Input
                  id="place-address"
                  value={placeAddress}
                  onChange={(e) => setPlaceAddress(e.target.value)}
                />
              </div>
              {placeName.trim() && (
                <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[36px]">
                  <Checkbox
                    checked={savePlace}
                    onCheckedChange={(c) => setSavePlace(c === true)}
                  />
                  Guardar este lugar
                </label>
              )}
            </>
          )}

          {!useSaved && hasGoogleMapsApiKey ? (
            <div className="space-y-1.5">
              <Label htmlFor="place-search">Busca en el mapa</Label>
              <PlacePicker
                inputClassName="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Busca un lugar y rellenamos el nombre"
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
              <p className="text-xs text-muted-foreground">
                Configura <code>VITE_GOOGLE_MAPS_API_KEY</code> para el mapa.
              </p>
            )
          )}
        </fieldset>

        <Button
          className="w-full"
          disabled={!title.trim() || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Creando…' : 'Crear plan'}
        </Button>
      </div>
    </div>
  );
}
