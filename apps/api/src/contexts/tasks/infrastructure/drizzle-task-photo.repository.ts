import { eq } from 'drizzle-orm';
import type { DatabaseExecutor } from '../../../db/db.types';
import { taskPhotos } from '../../../db/schema';
import type { TaskPhoto } from '../domain/task';
import type { TaskPhotoRepository } from '../domain/ports/task-photo.repository';
import { TaskMapper } from './task.mapper';

/** Adaptador Drizzle de {@link TaskPhotoRepository}. */
export class DrizzleTaskPhotoRepository implements TaskPhotoRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async create(photo: TaskPhoto): Promise<void> {
    await this.db.insert(taskPhotos).values({
      id: photo.id,
      taskId: photo.taskId,
      storagePath: photo.storagePath,
      createdAt: photo.createdAt,
    });
  }

  async findByTask(taskId: string): Promise<TaskPhoto[]> {
    const rows = await this.db
      .select()
      .from(taskPhotos)
      .where(eq(taskPhotos.taskId, taskId))
      .orderBy(taskPhotos.createdAt);
    return rows.map((r) => TaskMapper.toPhoto(r));
  }

  async findById(photoId: string): Promise<TaskPhoto | null> {
    const rows = await this.db
      .select()
      .from(taskPhotos)
      .where(eq(taskPhotos.id, photoId))
      .limit(1);
    const row = rows[0];
    return row ? TaskMapper.toPhoto(row) : null;
  }

  async deleteById(photoId: string): Promise<void> {
    await this.db.delete(taskPhotos).where(eq(taskPhotos.id, photoId));
  }
}
