/* ─── Vista presentacional cozy — groups (listado de peñas) ──────────────────
 *
 * Theme `cozy` ("Cuaderno de papel manuscrito": papel crema pautado, tinta
 * marrón, boli azul, notas pegadas con cinta y chinchetas, fuentes manuscritas).
 * Reestiliza la vista base del listado de peñas con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/cozy.tsx → Groups): página `ck-page`,
 * cabecera centrada con titular Caveat (`ck-marker`), lista de notas `ck-card`
 * con chincheta (`ck-pin`), nombre manuscrito, descripción y `ck-tag` de rol, y
 * acciones de crear (azul) / unirse (blanco) en rejilla de 2.
 *
 * Mismo contrato `GroupsViewProps`, misma funcionalidad y mismos callbacks que la
 * base. Reutiliza el componente compartido `ScreenState` (theme-agnóstico:
 * gestiona carga/error/vacío) igual que la base, para no perder esos estados.
 *
 * Datos REALES por props: la maqueta del kit usaba `mockGroups` con nombres y
 * descripciones inventados; aquí el subtítulo (contador) y las tarjetas salen de
 * `groups` (nombre, descripción, rol), y las acciones llaman a `onCreate`/`onJoin`.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 * ─────────────────────────────────────────────────────────────────────────── */

import { ScreenState } from '@/shared/components/ScreenState';
import type { GroupSummaryDto } from '../../contracts';
import type { GroupsViewProps } from '../types';

// Brillos de chincheta del kit (rotación por índice; cabezal sobre tinta blanca).
const PINS = ['#c0392b', '#2d4a8a', '#5b8a3a', '#e3a51a', '#8e44ad'];

export default function GroupsView({
  groups,
  isLoading,
  error,
  onSelect,
  onCreate,
  onJoin,
}: GroupsViewProps) {
  const countLabel = `${groups.length} ${groups.length === 1 ? 'peña' : 'peñas'}`;

  return (
    <div className="ck ck-page min-h-[100dvh]">
      <div className="max-w-[520px] mx-auto px-5 pt-8 pb-24">
        {/* ── Cabecera ── */}
        <header className="text-center mb-6">
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h1 className="ck-marker text-5xl leading-none mt-1 text-accent">Mis peñas</h1>
          <p className="text-base mt-2 opacity-80">{countLabel}</p>
        </header>

        <ScreenState
          isLoading={isLoading}
          error={error ?? undefined}
          isEmpty={!isLoading && !error && groups.length === 0}
          emptyIcon={<span className="text-4xl">🎉</span>}
          emptyTitle="Aún no perteneces a ninguna peña. Crea una nueva o únete con un PIN de invitación."
        >
          <ul className="space-y-4" aria-label="Mis peñas">
            {groups.map((group, i) => (
              <li key={group.id}>
                <GroupCard
                  group={group}
                  pin={PINS[i % PINS.length]!}
                  rotate={i % 2 ? 1 : -1}
                  onSelect={() => onSelect(group)}
                />
              </li>
            ))}
          </ul>
        </ScreenState>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button type="button" className="ck-btn ck-btn-blue" onClick={onCreate}>
            + crear
          </button>
          <button type="button" className="ck-btn" onClick={onJoin}>
            unirme
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponentes presentacionales ─────────────────────────────────────────

function GroupCard({
  group,
  pin,
  rotate,
  onSelect,
}: {
  group: GroupSummaryDto;
  pin: string;
  rotate: number;
  onSelect: () => void;
}) {
  const roleLabel = group.role === 'OWNER' ? 'Propietario' : 'Miembro';
  return (
    <button
      type="button"
      onClick={onSelect}
      className="ck-card w-full p-4 text-left flex items-center gap-4"
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-label={`Abrir peña ${group.name}`}
    >
      <span
        className="ck-pin"
        style={{ background: `radial-gradient(circle at 30% 30%, #fff, ${pin})` }}
      />
      <GroupAvatar name={group.name} imageUrl={group.imageUrl} color={pin} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="ck-marker text-2xl leading-none truncate text-accent">{group.name}</p>
        {group.description && (
          <p className="text-base opacity-80 mt-1 truncate">{group.description}</p>
        )}
        <span className="ck-tag mt-2 w-fit">{roleLabel}</span>
      </div>
    </button>
  );
}

function GroupAvatar({
  name,
  imageUrl,
  color,
}: {
  name: string;
  imageUrl?: string;
  color: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      className="ck-marker h-12 w-12 shrink-0 grid place-items-center rounded-full text-2xl text-white"
      style={{ background: color }}
      aria-hidden="true"
    >
      {name[0]?.toUpperCase()}
    </span>
  );
}
