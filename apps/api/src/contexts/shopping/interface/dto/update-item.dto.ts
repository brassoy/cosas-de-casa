import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** Body de `PATCH /items/:itemId`. Todos los campos son opcionales (patch parcial). */
export class UpdateItemDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre del artículo debe ser una cadena.' })
  @MinLength(1, { message: 'El nombre del artículo no puede estar vacío.' })
  @MaxLength(200, { message: 'El nombre no puede superar los 200 caracteres.' })
  name?: string;

  @IsOptional()
  @IsNumber({}, { message: 'La cantidad debe ser un número.' })
  @IsPositive({ message: 'La cantidad debe ser positiva.' })
  quantity?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsUrl({}, { message: 'El enlace de compra debe ser una URL válida.' })
  purchaseLink?: string | null;

  @IsOptional()
  @IsBoolean()
  checked?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  position?: number | null;
}
