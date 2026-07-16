import { createZodDto } from 'nestjs-zod';
import { CreateRoutineInputSchema } from '@cosasdecasa/contracts';

export class CreateRoutineDto extends createZodDto(CreateRoutineInputSchema.strict()) {}
