import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class SuggestMenuDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  dishCount?: number;
}
