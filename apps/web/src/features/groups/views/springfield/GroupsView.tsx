/* ─── Vista presentacional springfield — groups (listado de peñas) ───────────
 *
 * Theme `springfield` ("Cómic pop": bordes gruesos de tinta, hard shadows con
 * offset, colores planos saturados). Reestiliza la vista base del listado de
 * peñas con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/springfield.tsx → Groups): cabecera
 * `sf-card-y` con sticker "← Atrás", titular Bangers + subtítulo Fredoka, lista
 * de tarjetas `sf-card` (alternando amarillo/celeste) con `sf-wob` al hover, y
 * acciones de crear (rojo) / unirse (blanco) en rejilla de 2.
 *
 * Mismo contrato `GroupsViewProps`, misma funcionalidad y mismos callbacks que la
 * base. Reutiliza el componente compartido `ScreenState` (theme-agnóstico:
 * gestiona carga/error/vacío) igual que la base, para no perder esos estados.
 *
 * Datos REALES por props: la maqueta del kit usaba `mockGroups` con nombres y un
 * contador "N cuadrillas" inventados; aquí el subtítulo y las tarjetas salen de
 * `groups` (nombre, descripción, rol), y el back navega a `onCreate`/`onJoin`.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 * ─────────────────────────────────────────────────────────────────────────── */

import { ScreenState } from '@/shared/components/ScreenState';
import type { GroupSummaryDto } from '../../contracts';
import type { GroupsViewProps } from '../types';

// Fondos planos del kit para alternar tarjetas (rotación por índice).
const CARD_BGS = ['#FFD90F', '#70C5FF', '#F48FB1', '#7CB342'];

const INK = '#1A1A1A';

export default function GroupsView({
  groups,
  isLoading,
  error,
  onSelect,
  onCreate,
  onJoin,
}: GroupsViewProps) {
  const countLabel = `${groups.length} ${groups.length === 1 ? 'cuadrilla' : 'cuadrillas'}`;

  return (
    <div className="sf min-h-[100dvh] px-5 py-6" style={{ background: '#FFF3C4' }}>
      <div className="max-w-[520px] mx-auto">
        {/* ── Cabecera (sf-card-y + sticker + Bangers) ── */}
        <header className="sf-card-y p-4 mb-5 relative sf-pop">
          <h1 className="sf-bangers text-4xl leading-none mt-1">Mis peñas</h1>
          <p className="sf-fredoka text-sm mt-1">{countLabel}</p>
          <Lightning className="absolute -top-3 right-3 w-7 sf-wob" />
        </header>

        <ScreenState
          isLoading={isLoading}
          error={error ?? undefined}
          isEmpty={!isLoading && !error && groups.length === 0}
          emptyIcon={<span className="text-4xl">🎉</span>}
          emptyTitle="Aún no perteneces a ninguna peña. Crea una nueva o únete con un PIN de invitación."
        >
          <ul className="space-y-3" aria-label="Mis peñas">
            {groups.map((group, i) => (
              <li key={group.id}>
                <GroupCard
                  group={group}
                  bg={CARD_BGS[i % CARD_BGS.length]!}
                  onSelect={() => onSelect(group)}
                />
              </li>
            ))}
          </ul>
        </ScreenState>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button type="button" className="sf-btn sf-btn-r" onClick={onCreate}>
            + Crear
          </button>
          <button type="button" className="sf-btn sf-btn-w" onClick={onJoin}>
            Unirme
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponentes presentacionales ─────────────────────────────────────────

function GroupCard({
  group,
  bg,
  onSelect,
}: {
  group: GroupSummaryDto;
  bg: string;
  onSelect: () => void;
}) {
  const roleLabel = group.role === 'OWNER' ? 'Propietario' : 'Miembro';
  return (
    <button
      type="button"
      onClick={onSelect}
      className="sf-card p-4 sf-wob w-full text-left flex items-center gap-3"
      style={{ background: bg }}
      aria-label={`Abrir peña ${group.name}`}
    >
      <GroupAvatar name={group.name} imageUrl={group.imageUrl} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="sf-bangers text-2xl leading-none truncate">{group.name}</p>
        {group.description && (
          <p className="sf-fredoka text-sm mt-1 truncate">{group.description}</p>
        )}
        <span className="sf-tag mt-2 inline-block w-fit">{roleLabel}</span>
      </div>
    </button>
  );
}

function GroupAvatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="w-12 h-12 shrink-0 rounded-full object-cover border-[3px]"
        style={{ borderColor: INK, boxShadow: `3px 3px 0 ${INK}` }}
      />
    );
  }
  return (
    <div
      className="w-12 h-12 shrink-0 rounded-full grid place-items-center sf-bangers text-xl border-[3px]"
      style={{ background: '#fff', borderColor: INK, boxShadow: `3px 3px 0 ${INK}` }}
    >
      <span aria-hidden="true">{name[0]?.toUpperCase()}</span>
    </div>
  );
}

function Lightning(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden="true" {...props}>
      <path
        d="M14 0 L2 18 H10 L8 32 L22 12 H14 Z"
        fill="#FFD90F"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
