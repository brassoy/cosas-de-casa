import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEventDto {
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
  @MaxLength(500)
  location?: string;

  @IsISO8601({ strict: true })
  startsAt!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  recurrenceRule?: string;

  @IsOptional()
  @IsUUID('4', { each: true })
  attendeeIds?: string[];
}
