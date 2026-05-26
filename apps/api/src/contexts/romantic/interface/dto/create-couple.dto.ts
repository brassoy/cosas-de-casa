import { IsUUID } from 'class-validator';

export class CreateCoupleDto {
  @IsUUID('4')
  partnerUserId!: string;
}
