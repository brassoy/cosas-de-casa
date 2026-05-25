import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** Body de `POST /items/:itemId/comments`. */
export class AddCommentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El comentario no puede estar vacío.' })
  @MinLength(1, { message: 'El comentario no puede estar vacío.' })
  @MaxLength(1000, { message: 'El comentario no puede superar los 1000 caracteres.' })
  body!: string;
}
