import { IsArray, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato esperado: YYYY-MM-DD.' })
  recommendedDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato esperado: YYYY-MM-DD.' })
  deadlineDate?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  assigneeIds?: string[];
}
