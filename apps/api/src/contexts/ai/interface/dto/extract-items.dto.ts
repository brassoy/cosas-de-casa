import { IsString, MinLength, MaxLength } from 'class-validator';

export class ExtractItemsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  phrase!: string;
}
