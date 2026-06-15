import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { TaskDto } from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';

import { CreateTaskUseCase } from '../application/create-task.use-case';
import { ListTasksUseCase } from '../application/list-tasks.use-case';
import { GetTaskUseCase } from '../application/get-task.use-case';
import { UpdateTaskUseCase } from '../application/update-task.use-case';
import { DeleteTaskUseCase } from '../application/delete-task.use-case';
import { SetAssigneesUseCase } from '../application/set-assignees.use-case';
import { AddTaskPhotoUseCase } from '../application/add-task-photo.use-case';
import { RemoveTaskPhotoUseCase } from '../application/remove-task-photo.use-case';
import { GenerateListFromTaskUseCase } from '../application/generate-list-from-task.use-case';

import { TASK_PHOTO_REPOSITORY, type TaskPhotoRepository } from '../domain/ports/task-photo.repository';
import { TaskAssigneesReadModel } from '../infrastructure/task-assignees-read-model';
import { TaskPresenter } from './task.presenter';
import { TaskErrorFilter } from './task-error.filter';
import { TaskScopeGuard } from './task-scope.guard';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssigneesDto } from './dto/assignees.dto';
import { AddPhotoDto } from './dto/add-photo.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';

import type { ShoppingListSummaryDto } from '@cosasdecasa/contracts';
import { ShoppingPresenter } from '../../shopping/interface/shopping.presenter';
import { Inject } from '@nestjs/common';

/**
 * Controller del contexto `tasks`.
 *
 * Rutas bajo `/api/v1/families/:familyId/tasks` → requieren {@link FamilyScopeGuard}.
 * Rutas bajo `/api/v1/tasks/:taskId` → requieren {@link TaskScopeGuard}.
 */
@ApiBearerAuth()
@UseFilters(TaskErrorFilter)
@UseGuards(JwtAuthGuard)
@Controller()
@ApiTags('tasks')
export class TasksController {
  constructor(
    private readonly createTask: CreateTaskUseCase,
    private readonly listTasks: ListTasksUseCase,
    private readonly getTask: GetTaskUseCase,
    private readonly updateTask: UpdateTaskUseCase,
    private readonly deleteTask: DeleteTaskUseCase,
    private readonly setAssignees: SetAssigneesUseCase,
    private readonly addPhoto: AddTaskPhotoUseCase,
    private readonly removePhoto: RemoveTaskPhotoUseCase,
    private readonly generateList: GenerateListFromTaskUseCase,
    @Inject(TASK_PHOTO_REPOSITORY) private readonly photoRepo: TaskPhotoRepository,
    private readonly assigneesReadModel: TaskAssigneesReadModel,
  ) {}

  // ── Rutas con familyId (FamilyScopeGuard) ────────────────────────────────

  @Post('families/:familyId/tasks')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Crear una tarea doméstica para una familia.' })
  @ApiCreatedResponse({ description: 'Tarea creada.' })
  async createTaskHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: CreateTaskDto,
  ): Promise<TaskDto> {
    const task = await this.createTask.execute({
      familyId,
      title: body.title,
      description: body.description,
      recommendedDate: body.recommendedDate,
      deadlineDate: body.deadlineDate,
      createdBy: user.id,
      assigneeIds: body.assigneeIds,
    });

    const photos = await this.photoRepo.findByTask(task.id);
    const assignees = await this.assigneesReadModel.enrichAssignees(task.assigneeIds);
    return TaskPresenter.toTaskDto(task, assignees, photos);
  }

  @Get('families/:familyId/tasks')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Listar las tareas de una familia (con filtros opcionales).' })
  @ApiOkResponse({ description: 'Lista de tareas.' })
  async listTasksHandler(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query() query: ListTasksQueryDto,
  ): Promise<TaskDto[]> {
    const taskList = await this.listTasks.execute({
      familyId,
      filter: {
        status: query.status,
        assigneeId: query.assigneeId,
      },
    });

    // Batch: resuelve los assignees de TODAS las tareas en una sola query
    // (WHERE id IN (...)) en vez de una por tarea (N+1).
    const assigneesByTask = await this.assigneesReadModel.findAssigneesByTasks(
      taskList.map((task) => ({ taskId: task.id, assigneeIds: task.assigneeIds })),
    );

    return Promise.all(
      taskList.map(async (task) => {
        const photos = await this.photoRepo.findByTask(task.id);
        const assignees = assigneesByTask.get(task.id) ?? [];
        return TaskPresenter.toTaskDto(task, assignees, photos);
      }),
    );
  }

  // ── Rutas con taskId (TaskScopeGuard) ────────────────────────────────────

  @Get('tasks/:taskId')
  @UseGuards(TaskScopeGuard)
  @ApiOperation({ summary: 'Obtener una tarea por id.' })
  @ApiOkResponse({ description: 'Tarea.' })
  async getTaskHandler(
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<TaskDto> {
    const task = await this.getTask.execute({ taskId });
    const photos = await this.photoRepo.findByTask(task.id);
    const assignees = await this.assigneesReadModel.enrichAssignees(task.assigneeIds);
    return TaskPresenter.toTaskDto(task, assignees, photos);
  }

  @Patch('tasks/:taskId')
  @UseGuards(TaskScopeGuard)
  @ApiOperation({ summary: 'Editar una tarea (patch parcial).' })
  @ApiOkResponse({ description: 'Tarea actualizada.' })
  async updateTaskHandler(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: UpdateTaskDto,
  ): Promise<TaskDto> {
    const task = await this.updateTask.execute({
      taskId,
      title: body.title,
      description: body.description,
      status: body.status,
      recommendedDate: body.recommendedDate,
      deadlineDate: body.deadlineDate,
    });

    const photos = await this.photoRepo.findByTask(task.id);
    const assignees = await this.assigneesReadModel.enrichAssignees(task.assigneeIds);
    return TaskPresenter.toTaskDto(task, assignees, photos);
  }

  @Delete('tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TaskScopeGuard)
  @ApiOperation({ summary: 'Eliminar una tarea.' })
  @ApiNoContentResponse({ description: 'Tarea eliminada.' })
  async deleteTaskHandler(
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<void> {
    await this.deleteTask.execute({ taskId });
  }

  // ── Asignados ─────────────────────────────────────────────────────────────

  @Patch('tasks/:taskId/assignees')
  @UseGuards(TaskScopeGuard)
  @ApiOperation({ summary: 'Reemplazar los asignados de una tarea.' })
  @ApiOkResponse({ description: 'Asignados actualizados.' })
  async setAssigneesHandler(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: AssigneesDto,
  ): Promise<TaskDto> {
    const task = await this.setAssignees.execute({
      taskId,
      assigneeIds: body.assigneeIds,
    });

    const photos = await this.photoRepo.findByTask(task.id);
    const assignees = await this.assigneesReadModel.enrichAssignees(task.assigneeIds);
    return TaskPresenter.toTaskDto(task, assignees, photos);
  }

  // ── Fotos ─────────────────────────────────────────────────────────────────

  @Post('tasks/:taskId/photos')
  @UseGuards(TaskScopeGuard)
  @ApiOperation({ summary: 'Registrar la ruta de una foto subida al bucket task-photos.' })
  @ApiCreatedResponse({ description: 'Foto registrada.' })
  async addPhotoHandler(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() body: AddPhotoDto,
  ): Promise<TaskDto> {
    await this.addPhoto.execute({ taskId, storagePath: body.storagePath });

    const task = await this.getTask.execute({ taskId });
    const photos = await this.photoRepo.findByTask(task.id);
    const assignees = await this.assigneesReadModel.enrichAssignees(task.assigneeIds);
    return TaskPresenter.toTaskDto(task, assignees, photos);
  }

  @Delete('tasks/:taskId/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TaskScopeGuard)
  @ApiOperation({ summary: 'Eliminar una foto de tarea.' })
  @ApiNoContentResponse({ description: 'Foto eliminada.' })
  async removePhotoHandler(
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<void> {
    await this.removePhoto.execute({ photoId });
  }

  // ── Generar lista de la compra ────────────────────────────────────────────

  @Post('tasks/:taskId/generate-list')
  @UseGuards(TaskScopeGuard)
  @ApiOperation({ summary: 'Crear una lista CUSTOM de la compra con el nombre de la tarea.' })
  @ApiCreatedResponse({ description: 'Lista de la compra creada.' })
  async generateListHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<ShoppingListSummaryDto> {
    const list = await this.generateList.execute({
      taskId,
      actingUserId: user.id,
    });
    return ShoppingPresenter.toListSummaryDto(list);
  }
}
