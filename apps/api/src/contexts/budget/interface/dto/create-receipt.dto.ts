import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  MaxLength,
  Min,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SpendCategoryEnum {
  Groceries = 'groceries',
  Household = 'household',
  DiningOut = 'dining_out',
  Leisure = 'leisure',
  Other = 'other',
}

export class CreateReceiptLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description!: string;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsNumber()
  @Min(0)
  lineTotal!: number;

  @IsOptional()
  @IsEnum(SpendCategoryEnum)
  category?: SpendCategoryEnum;
}

export class CreateReceiptDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  merchant?: string;

  @IsString()
  @IsNotEmpty()
  purchasedAt!: string;

  @IsNumber()
  @Min(0)
  total!: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  imagePath?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceiptLineDto)
  lines?: CreateReceiptLineDto[];
}
