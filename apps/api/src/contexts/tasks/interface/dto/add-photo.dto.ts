import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddPhotoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  storagePath!: string;
}
