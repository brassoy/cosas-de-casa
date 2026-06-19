import { createZodDto } from 'nestjs-zod';
import { ChangeMemberRoleInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `PATCH /families/:familyId/members/:userId`. Derivado del contrato Zod
 * compartido (`ChangeMemberRoleInputSchema`). `.strict()` rechaza propiedades
 * desconocidas.
 */
export class ChangeMemberRoleDto extends createZodDto(ChangeMemberRoleInputSchema.strict()) {}
