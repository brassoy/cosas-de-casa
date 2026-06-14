/* ─── Vista presentacional cozysitcom — groups (listado de peñas) ────────────
 *
 * Theme `cozysitcom` ("Sitcom Cozy 70s": retro cálido, madera y mostaza).
 * Reestiliza la vista base del listado de peñas con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/cozysitcom.tsx → Groups): cabecera con
 * placa de madera + titular serif + cinta a rayas, tarjetas `cz-frame` por peña
 * con avatar, nombre, descripción y rol (`cz-tag`), y acciones de crear (denim) /
 * unirse (fantasma).
 *
 * Mismo contrato `GroupsViewProps`, misma funcionalidad y mismos callbacks que la
 * base. Reutiliza el componente compartido `ScreenState` (es theme-agnóstico:
 * gestiona carga/error/vacío) igual que la base, para no perder esos estados.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 * ─────────────────────────────────────────────────────────────────────────── */

import { ScreenState } from '@/shared/components/ScreenState';
import type { GroupSummaryDto } from '../../contracts';
import type { GroupsViewProps } from '../types';

// Paleta de acento del kit para el avatar (rotación por índice).
const ACCENTS = ['#2F5D8C', '#E3B23C', '#A63A3A', '#5F7A4F', '#8B5E3C'];

export default function GroupsView({
  groups,
  isLoading,
  error,
  onSelect,
  onCreate,
  onJoin,
}: GroupsViewProps) {
  return (
    <div className="cz min-h-[100dvh] px-4 py-8" style={{ background: 'var(--color-surface)' }}>
      <div className="w-full max-w-[520px] mx-auto">
        <header className="mb-5 cz-pop">
          <div className="cz-wood inline-block mb-2">
            <p className="cz-serif text-base">Tus peñas</p>
          </div>
          <h1 className="cz-serif text-4xl leading-none">Mis peñas</h1>
          <p className="text-sm opacity-70 mt-1">Grupos para compartir planes con amigos.</p>
          <div className="cz-stripe mt-3" />
        </header>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <button type="button" className="cz-btn-denim" onClick={onCreate}>
            + Nueva peña
          </button>
          <button type="button" className="cz-btn-ghost" onClick={onJoin}>
            Unirse con PIN
          </button>
        </div>

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
                  accent={ACCENTS[i % ACCENTS.length]!}
                  onSelect={() => onSelect(group)}
                />
              </li>
            ))}
          </ul>
        </ScreenState>
      </div>
    </div>
  );
}

// ── Subcomponentes presentacionales ─────────────────────────────────────────

function GroupCard({
  group,
  accent,
  onSelect,
}: {
  group: GroupSummaryDto;
  accent: string;
  onSelect: () => void;
}) {
  const roleLabel = group.role === 'OWNER' ? 'Propietario' : 'Miembro';
  return (
    <button
      type="button"
      onClick={onSelect}
      className="cz-frame w-full text-left flex items-center gap-3"
      aria-label={`Abrir peña ${group.name}`}
    >
      <GroupAvatar name={group.name} imageUrl={group.imageUrl} accent={accent} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="cz-serif text-xl truncate">{group.name}</p>
        {group.description && (
          <p className="truncate text-sm opacity-70">{group.description}</p>
        )}
        <span className="cz-tag w-fit">{roleLabel}</span>
      </div>
    </button>
  );
}

function GroupAvatar({
  name,
  imageUrl,
  accent,
}: {
  name: string;
  imageUrl?: string;
  accent: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-12 w-12 shrink-0 rounded-full object-cover border-2 border-white shadow"
      />
    );
  }
  return (
    <div
      className="h-12 w-12 shrink-0 rounded-full grid place-items-center text-white text-xl font-extrabold border-2 border-white shadow"
      style={{ background: accent }}
    >
      <span aria-hidden="true">{name[0]?.toUpperCase()}</span>
    </div>
  );
}
