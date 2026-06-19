import { Inject, Injectable } from '@nestjs/common';
import {
  COUPLE_NOTE_REPOSITORY,
  type CoupleNoteRepository,
} from '../domain/ports/couple-note.repository';
import { CoupleNoteNotFoundError } from '../domain/romantic.errors';

export interface DeleteCoupleNoteCommand {
  coupleId: string;
  noteId: string;
}

/**
 * Caso de uso "borrar nota de pareja".
 *
 * El `CoupleScopeGuard` ya garantiza que quien llama es miembro de la pareja.
 * Aquí validamos que la nota exista Y pertenezca a esa pareja, para que un
 * miembro no pueda borrar (adivinando el id) notas de otra pareja.
 *
 * Decisión de privacidad: en el rincón compartido cualquiera de los dos miembros
 * puede borrar cualquier nota (espacio común), no solo el autor.
 */
@Injectable()
export class DeleteCoupleNoteUseCase {
  constructor(
    @Inject(COUPLE_NOTE_REPOSITORY) private readonly notes: CoupleNoteRepository,
  ) {}

  async execute(cmd: DeleteCoupleNoteCommand): Promise<void> {
    const note = await this.notes.findById(cmd.noteId);
    if (!note || note.coupleId !== cmd.coupleId) {
      throw new CoupleNoteNotFoundError();
    }

    await this.notes.delete(cmd.noteId);
  }
}
