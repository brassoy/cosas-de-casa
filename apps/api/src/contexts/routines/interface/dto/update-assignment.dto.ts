import { createZodDto } from 'nestjs-zod';
import { UpdateAssignmentInputSchema } from '@cosasdecasa/contracts';

export class UpdateAssignmentDto extends createZodDto(UpdateAssignmentInputSchema.strict()) {}
