import { Inject, Injectable } from '@nestjs/common';
import type { CoupleNote } from '../domain/couple-note';
import {
  COUPLE_NOTE_REPOSITORY,
  type CoupleNoteRepository,
} from '../domain/ports/couple-note.repository';

export interface ListCoupleNotesCommand {
  coupleId: string;
}

@Injectable()
export class ListCoupleNotesUseCase {
  constructor(
    @Inject(COUPLE_NOTE_REPOSITORY) private readonly notes: CoupleNoteRepository,
  ) {}

  async execute(cmd: ListCoupleNotesCommand): Promise<CoupleNote[]> {
    return this.notes.findByCouple(cmd.coupleId);
  }
}
