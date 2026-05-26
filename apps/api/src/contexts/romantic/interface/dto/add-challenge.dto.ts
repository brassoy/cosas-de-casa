import { IsString, MinLength } from 'class-validator';

export class AddChallengeDto {
  @IsString()
  @MinLength(1)
  challengeKey!: string;
}
