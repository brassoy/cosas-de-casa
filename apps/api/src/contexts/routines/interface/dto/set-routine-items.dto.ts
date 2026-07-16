import { createZodDto } from 'nestjs-zod';
import { SetRoutineItemsInputSchema } from '@cosasdecasa/contracts';

export class SetRoutineItemsDto extends createZodDto(SetRoutineItemsInputSchema.strict()) {}
