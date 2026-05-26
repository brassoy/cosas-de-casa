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
  CALENDAR_EVENT_REPOSITORY,
  type CalendarEventRepository,
} from '../domain/ports/calendar-event.repository';

/**
 * Guard de ámbito de evento de calendario.
 *
 * Para rutas sin `:familyId` (p.ej. GET /calendar/events/:eventId):
 * 1. Carga el evento para obtener su `familyId`.
 * 2. Verifica que el usuario autenticado sea miembro de esa familia.
 */
@Injectable()
export class EventScopeGuard implements CanActivate {
  constructor(
    @Inject(CALENDAR_EVENT_REPOSITORY) private readonly events: CalendarEventRepository,
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No estás autenticado.');
    }

    const eventId = request.params?.eventId as string | undefined;
    if (!eventId) {
      return true;
    }

    const event = await this.events.findById(eventId);
    if (!event) {
      throw new NotFoundException('El evento no existe.');
    }

    const family = await this.families.findById(event.familyId);
    if (!family) {
      throw new NotFoundException('La familia de este evento no existe.');
    }

    if (!family.isMember(user.id)) {
      throw new ForbiddenException('No perteneces a la familia de este evento.');
    }

    return true;
  }
}
