import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListTasksQueryDto {
  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'DONE'])
  status?: 'OPEN' | 'IN_PROGRESS' | 'DONE';

  @IsOptional()
  @IsUUID(4)
  assigneeId?: string;
}
