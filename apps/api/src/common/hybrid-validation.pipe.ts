import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
  ValidationPipe,
} from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';
import { ZodError } from 'zod';

/**
 * Pipe de Zod con un formato de error que el frontend ya entiende: `message`
 * como cadena única (la primera incidencia) + `details` con todas. El cliente
 * lee `body.message` como string y trata `details` como opcional (lo ignora),
 * así que el shape del 400 no cambia para la UI.
 */
const ZodPipe = createZodValidationPipe({
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

/**
 * Pipe de validación híbrido para la migración incremental a Zod.
 *
 * - DTOs derivados con `createZodDto` (llevan `isZodDto === true`) → validan con
 *   Zod, usando el schema del contrato compartido como única fuente de verdad.
 * - El resto de DTOs (class-validator) → conservan el comportamiento actual
 *   (`whitelist` + `forbidNonWhitelisted` + `transform`).
 *
 * Así un contexto ya migrado a Zod convive con los que siguen en class-validator
 * sin tocar a estos últimos.
 */
@Injectable()
export class HybridValidationPipe implements PipeTransform {
  private readonly zodPipe = new ZodPipe();
  private readonly classValidatorPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const metatype = metadata.metatype as { isZodDto?: boolean } | undefined;
    if (metatype?.isZodDto === true) {
      return this.zodPipe.transform(value, metadata);
    }
    return this.classValidatorPipe.transform(value, metadata);
  }
}
