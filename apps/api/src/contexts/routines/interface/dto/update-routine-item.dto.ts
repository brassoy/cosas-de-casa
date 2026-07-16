import { createZodDto } from 'nestjs-zod';
import { UpdateRoutineItemInputSchema } from '@cosasdecasa/contracts';

export class UpdateRoutineItemDto extends createZodDto(UpdateRoutineItemInputSchema.strict()) {}
