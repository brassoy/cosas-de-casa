import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Cuerpo del mensaje (se sanitiza el HTML).' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}
