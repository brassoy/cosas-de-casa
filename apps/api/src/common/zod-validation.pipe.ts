import { BadRequestException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';
import { ZodError } from 'zod';

/**
 * Pipe de validación global basado en Zod.
 *
 * Todos los DTOs se derivan de los schemas de `@cosasdecasa/contracts` con
 * `createZodDto`, así que esta es la única vía de validación de entrada.
 *
 * El 400 se devuelve con `message` (cadena: la primera incidencia) + `details`
 * (todas las incidencias), compatible con el cliente que lee `body.message`
 * como string y trata `details` como opcional.
 */
export const AppZodValidationPipe = createZodValidationPipe({
  createValidationException: (error: unknown) => {
    if (error instanceof ZodError) {
      const [first] = error.issues;
      const campo = first && first.path.length > 0 ? first.path.join('.') : 'body';
      const message = first ? `${campo}: ${first.message}` : 'Datos de entrada no válidos.';
      return new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message,
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return new BadRequestException('Datos de entrada no válidos.');
  },
});
