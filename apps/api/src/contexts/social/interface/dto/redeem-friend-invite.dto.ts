import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemFriendInviteDto {
  @ApiProperty({ description: 'Código de invitación de amistad (8 caracteres Crockford Base32).' })
  @IsString()
  @Length(8, 8)
  @Matches(/^[0-9A-Z]{8}$/)
  code!: string;

  @ApiProperty({ description: 'Id de la familia del usuario que canjea.' })
  @IsString()
  familyId!: string;
}
