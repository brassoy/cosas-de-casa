import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** Body de `POST /families`. */
export class CreateFamilyDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre es obligatorio.' })
  @MinLength(1, { message: 'El nombre es obligatorio.' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres.' })
  name!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500, { message: 'La descripción no puede superar los 500 caracteres.' })
  description?: string;

  @IsOptional()
  @IsUrl({}, { message: 'La imagen debe ser una URL válida.' })
  imageUrl?: string;
}
