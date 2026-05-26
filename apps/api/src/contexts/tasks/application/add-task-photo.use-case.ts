import { Inject, Injectable } from '@nestjs/common';
import { TaskPhoto } from '../domain/task';
import { TaskNotFoundError } from '../domain/task.errors';
import { TASK_REPOSITORY, type TaskRepository } from '../domain/ports/task.repository';
import { TASK_PHOTO_REPOSITORY, type TaskPhotoRepository } from '../domain/ports/task-photo.repository';
import { TASKS_CLOCK, type TasksClock } from './ports/clock';
import { TASKS_ID_GENERATOR, type TasksIdGenerator } from './ports/id-generator';

export interface AddTaskPhotoCommand {
  taskId: string;
  storagePath: string;
}

/** Caso de uso: registrar la ruta de una foto subida al bucket task-photos. */
@Injectable()
export class AddTaskPhotoUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(TASK_PHOTO_REPOSITORY) private readonly photos: TaskPhotoRepository,
    @Inject(TASKS_CLOCK) private readonly clock: TasksClock,
    @Inject(TASKS_ID_GENERATOR) private readonly ids: TasksIdGenerator,
  ) {}

  async execute(command: AddTaskPhotoCommand): Promise<TaskPhoto> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) throw new TaskNotFoundError();

    const photo = TaskPhoto.create({
      id: this.ids.generate(),
      taskId: command.taskId,
      storagePath: command.storagePath,
      now: this.clock.now(),
    });

    await this.photos.create(photo);
    return photo;
  }
}
