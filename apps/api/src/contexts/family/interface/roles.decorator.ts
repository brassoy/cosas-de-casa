import { type CustomDecorator, SetMetadata } from '@nestjs/common';
import type { MembershipRole } from '../domain/membership-role';

export const ROLES_KEY = 'family-required-roles';

/**
 * Marca un endpoint como restringido a determinados roles dentro de la familia
 * (p. ej. `@Roles('OWNER')`). Lo lee el {@link FamilyScopeGuard}.
 */
export const Roles = (...roles: MembershipRole[]): CustomDecorator => SetMetadata(ROLES_KEY, roles);
