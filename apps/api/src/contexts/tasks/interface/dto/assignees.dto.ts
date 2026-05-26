import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AssigneesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  assigneeIds!: string[];
}
