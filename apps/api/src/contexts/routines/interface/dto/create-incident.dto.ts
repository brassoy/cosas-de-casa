import { createZodDto } from 'nestjs-zod';
import { CreateIncidentInputSchema } from '@cosasdecasa/contracts';

export class CreateIncidentDto extends createZodDto(CreateIncidentInputSchema.strict()) {}
