import { Inject, Injectable } from '@nestjs/common';
import { TaskPhotoNotFoundError } from '../domain/task.errors';
import { TASK_PHOTO_REPOSITORY, type TaskPhotoRepository } from '../domain/ports/task-photo.repository';

export interface RemoveTaskPhotoCommand {
  photoId: string;
}

/** Caso de uso: eliminar una foto de tarea. */
@Injectable()
export class RemoveTaskPhotoUseCase {
  constructor(
    @Inject(TASK_PHOTO_REPOSITORY) private readonly photos: TaskPhotoRepository,
  ) {}

  async execute(command: RemoveTaskPhotoCommand): Promise<void> {
    const photo = await this.photos.findById(command.photoId);
    if (!photo) throw new TaskPhotoNotFoundError();
    await this.photos.deleteById(command.photoId);
  }
}
