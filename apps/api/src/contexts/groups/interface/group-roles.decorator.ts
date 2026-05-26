import { type CustomDecorator, SetMetadata } from '@nestjs/common';
import type { GroupRole } from '../domain/group-role';

export const GROUP_ROLES_KEY = 'group-required-roles';

/**
 * Marca un endpoint como restringido a determinados roles dentro de la peña
 * (p. ej. `@GroupRoles('OWNER')`). Lo lee el {@link GroupScopeGuard}.
 */
export const GroupRoles = (...roles: GroupRole[]): CustomDecorator =>
  SetMetadata(GROUP_ROLES_KEY, roles);
