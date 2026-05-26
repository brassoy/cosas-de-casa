import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SharePlanDto {
  @ApiProperty()
  @IsUUID()
  familyId!: string;
}
