/**
 * GroupsView — vista presentacional `base` (shadcn) del listado de peñas.
 *
 * El kit de Lovable no tenía componente base para groups; esta vista usa el mismo
 * lenguaje visual que `stats`/`menu` (Card, ScreenState, Button) sobre las CSS
 * vars semánticas. Equivale a un `PlansPage`-like: lista de tarjetas con avatar,
 * nombre, descripción y rol, más acciones de crear/unirse en la cabecera.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores. La navegación, el `setActiveGroup` y el fetch los hace el
 * container (`GroupsPage`).
 */

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { ScreenState } from '@/shared/components/ScreenState';
import type { GroupSummaryDto } from '../../contracts';
import type { GroupsViewProps } from '../types';

export default function GroupsView({
  groups,
  isLoading,
  error,
  onSelect,
  onCreate,
  onJoin,
}: GroupsViewProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <h2 className="text-3xl font-bold">Mis peñas</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onJoin}>
            Unirse con PIN
          </Button>
          <Button onClick={onCreate}>Nueva peña</Button>
        </div>
      </header>

      <ScreenState
        isLoading={isLoading}
        error={error ?? undefined}
        isEmpty={!isLoading && !error && groups.length === 0}
        emptyIcon={<span className="text-4xl">🎉</span>}
        emptyTitle="Aún no perteneces a ninguna peña. Crea una nueva o únete con un PIN de invitación."
      >
        <ul className="flex flex-col gap-2" aria-label="Mis peñas">
          {groups.map((group) => (
            <li key={group.id}>
              <GroupCard group={group} onSelect={() => onSelect(group)} />
            </li>
          ))}
        </ul>
      </ScreenState>
    </div>
  );
}

// ── Subcomponentes presentacionales ─────────────────────────────────────────

function GroupCard({
  group,
  onSelect,
}: {
  group: GroupSummaryDto;
  onSelect: () => void;
}) {
  const roleLabel = group.role === 'OWNER' ? 'Propietario' : 'Miembro';
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left transition-colors"
      aria-label={`Abrir peña ${group.name}`}
    >
      <Card className="flex items-center gap-4 p-4 hover:border-primary">
        <GroupAvatar name={group.name} imageUrl={group.imageUrl} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate font-semibold">{group.name}</p>
          {group.description && (
            <p className="truncate text-sm text-muted-foreground">{group.description}</p>
          )}
          <Badge variant="secondary" className="w-fit">
            {roleLabel}
          </Badge>
        </div>
      </Card>
    </button>
  );
}

function GroupAvatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
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
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-subtle text-xl font-bold text-accent">
      <span aria-hidden="true">{name[0]?.toUpperCase()}</span>
    </div>
  );
}
