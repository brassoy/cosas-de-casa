import type { CoupleNote } from '../couple-note';

export const COUPLE_NOTE_REPOSITORY = Symbol('COUPLE_NOTE_REPOSITORY');

export interface CoupleNoteRepository {
  save(note: CoupleNote): Promise<void>;
  findByCouple(coupleId: string): Promise<CoupleNote[]>;
}
