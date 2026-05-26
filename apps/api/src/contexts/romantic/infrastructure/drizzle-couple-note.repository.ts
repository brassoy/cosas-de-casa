import { eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { coupleNotes } from '../../../db/schema';
import { CoupleNote } from '../domain/couple-note';
import type { CoupleNoteRepository } from '../domain/ports/couple-note.repository';

/** Adaptador Drizzle de {@link CoupleNoteRepository}. */
export class DrizzleCoupleNoteRepository implements CoupleNoteRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async save(note: CoupleNote): Promise<void> {
    await this.db.insert(coupleNotes).values({
      id: note.id,
      coupleId: note.coupleId,
      authorId: note.authorId,
      body: note.body,
      createdAt: note.createdAt,
    });
  }

  async findByCouple(coupleId: string): Promise<CoupleNote[]> {
    const rows = await this.db
      .select()
      .from(coupleNotes)
      .where(eq(coupleNotes.coupleId, coupleId))
      .orderBy(coupleNotes.createdAt);

    return rows.map((row) => new CoupleNote({
      id: row.id,
      coupleId: row.coupleId,
      authorId: row.authorId,
      body: row.body,
      createdAt: row.createdAt,
    }));
  }
}
