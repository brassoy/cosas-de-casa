import { IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

/** Body de `POST /families/join`. */
export class JoinFamilyDto {
  /**
   * Código de invitación: 8 caracteres Crockford Base32 (sin I, L, O, U). Se
   * normaliza a mayúsculas y se recortan espacios antes de validar.
   */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString({ message: 'El código es obligatorio.' })
  @Length(8, 8, { message: 'El código debe tener 8 caracteres.' })
  @Matches(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/, {
    message: 'El código debe tener 8 caracteres (dígitos y letras, sin I, L, O ni U).',
  })
  code!: string;
}
