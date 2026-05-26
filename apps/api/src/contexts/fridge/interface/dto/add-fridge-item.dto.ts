import {
  IsEnum,
  IsISO8601,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { FridgeLocation } from '../../domain/fridge-item';

export class AddFridgeItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsNumberString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'La cantidad debe ser un número positivo.' })
  quantity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsEnum(['FRIDGE', 'FREEZER', 'PANTRY'])
  location?: FridgeLocation;

  @IsOptional()
  @IsISO8601({ strict: false })
  expiryDate?: string;
}
