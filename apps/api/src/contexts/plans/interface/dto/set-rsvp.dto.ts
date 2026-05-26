import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetRsvpDto {
  @ApiProperty({ enum: ['going', 'maybe', 'declined'] })
  @IsEnum(['going', 'maybe', 'declined'])
  status!: 'going' | 'maybe' | 'declined';
}
