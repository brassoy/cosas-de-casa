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
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SpendCategoryEnum } from './create-receipt.dto';

export enum ReceiptStatusEnum {
  Draft = 'draft',
  Confirmed = 'confirmed',
}

export class UpdateReceiptLineDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lineTotal?: number;

  @IsOptional()
  @IsEnum(SpendCategoryEnum)
  category?: SpendCategoryEnum;
}

export class UpdateReceiptDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  merchant?: string;

  @IsOptional()
  @IsString()
  purchasedAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsEnum(ReceiptStatusEnum)
  status?: ReceiptStatusEnum;

  @IsOptional()
  @IsString()
  imagePath?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateReceiptLineDto)
  lines?: UpdateReceiptLineDto[];
}
