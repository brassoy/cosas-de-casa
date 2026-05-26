import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../identity-access/interface/jwt-auth.guard';
import {
  FAMILY_REPOSITORY,
  type FamilyRepository,
} from '../../family/domain/ports/family.repository';
import {
  TASK_REPOSITORY,
  type TaskRepository,
} from '../domain/ports/task.repository';

/**
 * Guard de ámbito de tarea.
 *
 * Para rutas sin `:familyId` (p. ej. GET /tasks/:taskId):
 * 1. Carga la tarea para obtener su `familyId`.
 * 2. Verifica que el usuario autenticado sea miembro de esa familia.
 */
@Injectable()
export class TaskScopeGuard implements CanActivate {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No estás autenticado.');
    }

    const taskId = request.params?.taskId as string | undefined;
    if (!taskId) {
      return true;
    }

    const task = await this.tasks.findById(taskId);
    if (!task) {
      throw new NotFoundException('La tarea no existe.');
    }

    const family = await this.families.findById(task.familyId);
    if (!family) {
      throw new NotFoundException('La familia de esta tarea no existe.');
    }

    if (!family.isMember(user.id)) {
      throw new ForbiddenException('No perteneces a la familia de esta tarea.');
    }

    return true;
  }
}
