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
import { PLAN_REPOSITORY, type PlanRepository } from '../domain/ports/plan.repository';

/**
 * Guard de ámbito de plan (enforcement PRIMARIO de autorización de lectura).
 *
 * Para rutas con `:planId` (GET/DELETE /plans/:planId, POST /plans/:planId/{share,rsvp,messages},
 * GET/POST /plans/:planId/messages):
 * 1. Carga el plan para conocer su `ownerFamilyId` y `sharedWithFamilyIds`.
 * 2. Carga esas familias en una sola consulta (batch, sin N+1).
 * 3. Verifica que el usuario autenticado sea miembro de la familia propietaria
 *    O de alguna familia con la que el plan está compartido.
 *
 * Replica exactamente la regla de acceso de lectura de los casos de uso
 * (get-plan, list-plan-messages, set-rsvp, send-plan-message): "tiene acceso
 * quien es miembro de owner o de algún shared". Las acciones destructivas
 * (share/delete) conservan además la comprobación de OWNER en su caso de uso
 * como segunda línea de defensa.
 *
 * Debe ejecutarse DESPUÉS de {@link JwtAuthGuard} (necesita `request.user`).
 */
@Injectable()
export class PlanScopeGuard implements CanActivate {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No estás autenticado.');
    }

    const planId = request.params?.planId as string | undefined;
    if (!planId) {
      // Sin id de plan en la ruta no hay nada que comprobar aquí.
      return true;
    }

    const plan = await this.plans.findById(planId);
    if (!plan) {
      throw new NotFoundException('El plan no existe.');
    }

    const familyIds = [plan.ownerFamilyId, ...plan.sharedWithFamilyIds];
    const families = await this.families.findByIds(familyIds);
    const hasAccess = families.some((family) => family.isMember(user.id));
    if (!hasAccess) {
      throw new ForbiddenException('No tienes acceso a este plan.');
    }

    return true;
  }
}
