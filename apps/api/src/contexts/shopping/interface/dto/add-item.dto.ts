import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** Body de `POST /lists/:listId/items`. */
export class AddItemDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre del artículo es obligatorio.' })
  @MinLength(1, { message: 'El nombre del artículo es obligatorio.' })
  @MaxLength(200, { message: 'El nombre no puede superar los 200 caracteres.' })
  name!: string;

  @IsOptional()
  @IsNumber({}, { message: 'La cantidad debe ser un número.' })
  @IsPositive({ message: 'La cantidad debe ser positiva.' })
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUrl({}, { message: 'El enlace de compra debe ser una URL válida.' })
  purchaseLink?: string;
}
