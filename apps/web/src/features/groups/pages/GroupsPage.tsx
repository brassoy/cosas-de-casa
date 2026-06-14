/**
 * GroupsPage — CONTAINER del listado de peñas.
 *
 * Cablea la lógica real (useMyGroups, setActiveGroup, navegación) una sola vez y
 * delega el render en `ThemeView`, que monta la vista presentacional del theme
 * activo. La vista es presentacional pura.
 */

import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useMyGroups } from '../hooks/useGroups';
import { useGroupsStore } from '../store/groups.store';
import type { GroupSummaryDto } from '../contracts';
import type { GroupsViewProps } from '../views/types';

export function GroupsPage() {
  const navigate = useNavigate();
  const setActiveGroup = useGroupsStore((s) => s.setActiveGroup);
  const { data: groups, isLoading, error } = useMyGroups();

  async function handleSelectGroup(group: GroupSummaryDto) {
    setActiveGroup({ id: group.id, name: group.name });
    await navigate({ to: '/groups/$groupId', params: { groupId: group.id } });
  }

  const props: GroupsViewProps = {
    groups: groups ?? [],
    isLoading,
    error: error ? 'No se han podido cargar las peñas. Inténtalo de nuevo.' : null,
    onSelect: (group) => void handleSelectGroup(group),
    onCreate: () => void navigate({ to: '/groups/create' }),
    onJoin: () => void navigate({ to: '/groups/join' }),
  };

  return <ThemeView screen="groups" props={props} />;
}
