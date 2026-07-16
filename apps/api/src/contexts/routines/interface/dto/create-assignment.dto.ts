import { createZodDto } from 'nestjs-zod';
import { CreateAssignmentInputSchema } from '@cosasdecasa/contracts';

export class CreateAssignmentDto extends createZodDto(CreateAssignmentInputSchema.strict()) {}
