import { createZodDto } from 'nestjs-zod';
import { CreateSavedPlaceInputSchema } from '@cosasdecasa/contracts';

/**
 * Body de `POST /families/:familyId/places`. Derivado del contrato Zod compartido
 * (`CreateSavedPlaceInputSchema`, alias de `PlaceDtoSchema`). El `.strict()`
 * rechaza propiedades desconocidas.
 */
export class CreateSavedPlaceDto extends createZodDto(CreateSavedPlaceInputSchema.strict()) {}
