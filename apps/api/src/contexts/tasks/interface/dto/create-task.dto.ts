import { IsArray, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

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
  @IsISO8601({ strict: false })
  recommendedDate?: string;

  @IsOptional()
  @IsString()
  @IsISO8601({ strict: false })
  deadlineDate?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  assigneeIds?: string[];
}
