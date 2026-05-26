import { IsNumberString, IsOptional } from 'class-validator';

export class EatFridgeItemDto {
  @IsOptional()
  @IsNumberString()
  amount?: string;
}
