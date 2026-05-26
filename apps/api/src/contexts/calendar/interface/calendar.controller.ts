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
import type { CalendarEventDto } from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';

import { CreateEventUseCase } from '../application/create-event.use-case';
import { ListEventsUseCase } from '../application/list-events.use-case';
import { GetEventUseCase } from '../application/get-event.use-case';
import { UpdateEventUseCase } from '../application/update-event.use-case';
import { DeleteEventUseCase } from '../application/delete-event.use-case';
import { SetAttendeesUseCase } from '../application/set-attendees.use-case';

import { CalendarPresenter } from './calendar.presenter';
import { CalendarErrorFilter } from './calendar-error.filter';
import { EventScopeGuard } from './event-scope.guard';

import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsQueryDto } from './dto/list-events-query.dto';
import { SetAttendeesDto } from './dto/set-attendees.dto';

/**
 * Controller del contexto `calendar`.
 *
 * Rutas bajo `/api/v1/families/:familyId/calendar/events` → requieren {@link FamilyScopeGuard}.
 * Rutas bajo `/api/v1/calendar/events/:eventId` → requieren {@link EventScopeGuard}.
 */
@ApiBearerAuth()
@UseFilters(CalendarErrorFilter)
@UseGuards(JwtAuthGuard)
@Controller()
@ApiTags('calendar')
export class CalendarController {
  constructor(
    private readonly createEvent: CreateEventUseCase,
    private readonly listEvents: ListEventsUseCase,
    private readonly getEvent: GetEventUseCase,
    private readonly updateEvent: UpdateEventUseCase,
    private readonly deleteEvent: DeleteEventUseCase,
    private readonly setAttendees: SetAttendeesUseCase,
  ) {}

  // ── Rutas con familyId (FamilyScopeGuard) ────────────────────────────────

  @Post('families/:familyId/calendar/events')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Crear un evento de calendario para una familia.' })
  @ApiCreatedResponse({ description: 'Evento creado.' })
  async createEventHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: CreateEventDto,
  ): Promise<CalendarEventDto> {
    const event = await this.createEvent.execute({
      familyId,
      title: body.title,
      description: body.description,
      location: body.location,
      startsAt: new Date(body.startsAt),
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
      allDay: body.allDay,
      recurrenceRule: body.recurrenceRule,
      createdBy: user.id,
      attendeeIds: body.attendeeIds,
    });
    return CalendarPresenter.toEventDto(event);
  }

  @Get('families/:familyId/calendar/events')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Listar los eventos de una familia en un rango de fechas (?from=&to=, ISO 8601).' })
  @ApiOkResponse({ description: 'Lista de eventos en el rango.' })
  async listEventsHandler(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query() query: ListEventsQueryDto,
  ): Promise<CalendarEventDto[]> {
    const events = await this.listEvents.execute({
      familyId,
      from: new Date(query.from),
      to: new Date(query.to),
    });
    return events.map(CalendarPresenter.toEventDto);
  }

  // ── Rutas con eventId (EventScopeGuard) ──────────────────────────────────

  @Get('calendar/events/:eventId')
  @UseGuards(EventScopeGuard)
  @ApiOperation({ summary: 'Obtener un evento de calendario por id.' })
  @ApiOkResponse({ description: 'Evento.' })
  async getEventHandler(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<CalendarEventDto> {
    const event = await this.getEvent.execute({ eventId });
    return CalendarPresenter.toEventDto(event);
  }

  @Patch('calendar/events/:eventId')
  @UseGuards(EventScopeGuard)
  @ApiOperation({ summary: 'Editar un evento de calendario (patch parcial).' })
  @ApiOkResponse({ description: 'Evento actualizado.' })
  async updateEventHandler(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: UpdateEventDto,
  ): Promise<CalendarEventDto> {
    const event = await this.updateEvent.execute({
      eventId,
      title: body.title,
      description: body.description,
      location: body.location,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt !== undefined ? (body.endsAt ? new Date(body.endsAt) : null) : undefined,
      allDay: body.allDay,
      recurrenceRule: body.recurrenceRule,
    });
    return CalendarPresenter.toEventDto(event);
  }

  @Delete('calendar/events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(EventScopeGuard)
  @ApiOperation({ summary: 'Eliminar un evento de calendario.' })
  @ApiNoContentResponse({ description: 'Evento eliminado.' })
  async deleteEventHandler(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<void> {
    await this.deleteEvent.execute({ eventId });
  }

  @Patch('calendar/events/:eventId/attendees')
  @UseGuards(EventScopeGuard)
  @ApiOperation({ summary: 'Reemplazar los asistentes de un evento de calendario.' })
  @ApiOkResponse({ description: 'Asistentes actualizados.' })
  async setAttendeesHandler(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: SetAttendeesDto,
  ): Promise<CalendarEventDto> {
    const event = await this.setAttendees.execute({
      eventId,
      attendeeIds: body.attendeeIds,
    });
    return CalendarPresenter.toEventDto(event);
  }
}
