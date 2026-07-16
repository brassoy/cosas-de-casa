import { createZodDto } from 'nestjs-zod';
import { CreateRoutineItemInputSchema } from '@cosasdecasa/contracts';

export class CreateRoutineItemDto extends createZodDto(CreateRoutineItemInputSchema.strict()) {}
