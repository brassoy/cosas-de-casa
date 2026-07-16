import { createZodDto } from 'nestjs-zod';
import { ListRoutineItemsQuerySchema } from '@cosasdecasa/contracts';

export class ListRoutineItemsQueryDto extends createZodDto(
  ListRoutineItemsQuerySchema.strict(),
) {}
