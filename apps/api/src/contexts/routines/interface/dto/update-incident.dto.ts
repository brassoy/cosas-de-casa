import { createZodDto } from 'nestjs-zod';
import { UpdateIncidentInputSchema } from '@cosasdecasa/contracts';

export class UpdateIncidentDto extends createZodDto(UpdateIncidentInputSchema.strict()) {}
