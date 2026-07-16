import { createZodDto } from 'nestjs-zod';
import { ListRoutinesQuerySchema } from '@cosasdecasa/contracts';

export class ListRoutinesQueryDto extends createZodDto(ListRoutinesQuerySchema.strict()) {}
