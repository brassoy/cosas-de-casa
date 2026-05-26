import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class MenuToListDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ingredients!: string[];

  @IsOptional()
  @IsUUID()
  listId?: string;
}
