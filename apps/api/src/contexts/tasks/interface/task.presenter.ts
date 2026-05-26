import type { TaskDto, TaskAssigneeDto, TaskPhotoDto } from '@cosasdecasa/contracts';
import type { Task, TaskPhoto } from '../domain/task';

/** Traduce entidades de dominio a DTOs del contrato público. */
export const TaskPresenter = {
  toTaskDto(
    task: Task,
    assignees: TaskAssigneeDto[],
    photos: TaskPhoto[],
  ): TaskDto {
    return {
      id: task.id,
      familyId: task.familyId,
      title: task.title,
      description: task.description,
      status: task.status,
      recommendedDate: task.recommendedDate,
      deadlineDate: task.deadlineDate,
      createdBy: task.createdBy,
      assignees,
      photos: photos.map((p) => TaskPresenter.toPhotoDto(p)),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  },

  toAssigneeDto(userId: string, displayName: string | null): TaskAssigneeDto {
    return { userId, displayName };
  },

  toPhotoDto(photo: TaskPhoto): TaskPhotoDto {
    return {
      id: photo.id,
      taskId: photo.taskId,
      storagePath: photo.storagePath,
      createdAt: photo.createdAt.toISOString(),
    };
  },
};
