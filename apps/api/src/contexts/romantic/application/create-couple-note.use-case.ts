import { Inject, Injectable } from '@nestjs/common';
import { CoupleNote } from '../domain/couple-note';
import {
  COUPLE_NOTE_REPOSITORY,
  type CoupleNoteRepository,
} from '../domain/ports/couple-note.repository';
import { ROMANTIC_CLOCK, type RomanticClock } from './ports/clock';
import { ROMANTIC_ID_GENERATOR, type RomanticIdGenerator } from './ports/id-generator';

export interface CreateCoupleNoteCommand {
  coupleId: string;
  authorId: string;
  body: string;
}

@Injectable()
export class CreateCoupleNoteUseCase {
  constructor(
    @Inject(COUPLE_NOTE_REPOSITORY) private readonly notes: CoupleNoteRepository,
    @Inject(ROMANTIC_CLOCK) private readonly clock: RomanticClock,
    @Inject(ROMANTIC_ID_GENERATOR) private readonly ids: RomanticIdGenerator,
  ) {}

  async execute(cmd: CreateCoupleNoteCommand): Promise<CoupleNote> {
    const note = CoupleNote.create({
      id: this.ids.generate(),
      coupleId: cmd.coupleId,
      authorId: cmd.authorId,
      body: cmd.body,
      now: this.clock.now(),
    });

    await this.notes.save(note);
    return note;
  }
}
