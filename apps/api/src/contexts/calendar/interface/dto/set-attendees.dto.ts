import { ArrayMinSize, IsUUID } from 'class-validator';

export class SetAttendeesDto {
  @IsUUID('4', { each: true })
  @ArrayMinSize(0)
  attendeeIds!: string[];
}
