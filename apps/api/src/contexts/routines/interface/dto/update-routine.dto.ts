import { createZodDto } from 'nestjs-zod';
import { UpdateRoutineInputSchema } from '@cosasdecasa/contracts';

export class UpdateRoutineDto extends createZodDto(UpdateRoutineInputSchema.strict()) {}
