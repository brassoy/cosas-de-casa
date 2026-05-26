import {
  IsEnum,
  IsISO8601,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { FridgeLocation } from '../../domain/fridge-item';

export class UpdateFridgeItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsNumberString()
  quantity?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string | null;

  @IsOptional()
  @IsEnum(['FRIDGE', 'FREEZER', 'PANTRY'])
  location?: FridgeLocation;

  @IsOptional()
  @IsISO8601({ strict: false })
  expiryDate?: string | null;
}
