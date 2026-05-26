import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato esperado: YYYY-MM-DD.' })
  recommendedDate?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato esperado: YYYY-MM-DD.' })
  deadlineDate?: string | null;
}
