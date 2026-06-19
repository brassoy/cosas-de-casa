import { createZodDto } from 'nestjs-zod';
import { ChangeGroupMemberRoleInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /groups/:groupId/members/:userId`. Derivado del contrato Zod
 * compartido (`ChangeGroupMemberRoleInputSchema`). `.strict()` rechaza
 * propiedades desconocidas.
 */
export class ChangeGroupMemberRoleDto extends createZodDto(
  ChangeGroupMemberRoleInputSchema.strict(),
) {}
