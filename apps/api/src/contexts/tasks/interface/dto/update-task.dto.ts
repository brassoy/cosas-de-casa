import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'DONE'])
  status?: 'OPEN' | 'IN_PROGRESS' | 'DONE';

  @IsOptional()
  @IsString()
  @IsISO8601({ strict: false })
  recommendedDate?: string | null;

  @IsOptional()
  @IsString()
  @IsISO8601({ strict: false })
  deadlineDate?: string | null;
}
