import { createZodDto } from 'nestjs-zod';
import { CreateRecipeInputSchema } from '@cosasdecasa/contracts';

/** DTO de entrada para crear una receta. */
export class CreateRecipeDto extends createZodDto(CreateRecipeInputSchema.strict()) {}
