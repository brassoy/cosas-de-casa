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
  RECEIPT_REPOSITORY,
  type ReceiptRepository,
} from '../domain/ports/receipt.repository';
import {
  FAMILY_REPOSITORY,
  type FamilyRepository,
} from '../../family/domain/ports/family.repository';

/**
 * Guard de scope de ticket.
 *
 * Exige que el usuario autenticado sea MIEMBRO de la familia propietaria del
 * ticket indicado en `:receiptId`. Si no lo es → 403. Si no existe → 404.
 */
@Injectable()
export class ReceiptScopeGuard implements CanActivate {
  constructor(
    @Inject(RECEIPT_REPOSITORY) private readonly receipts: ReceiptRepository,
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) throw new ForbiddenException('No estás autenticado.');

    const receiptId = request.params?.receiptId as string | undefined;
    if (!receiptId) return true;

    const receipt = await this.receipts.findById(receiptId);
    if (!receipt) throw new NotFoundException('El ticket no existe.');

    const family = await this.families.findById(receipt.familyId);
    if (!family) throw new NotFoundException('La familia del ticket no existe.');

    if (!family.membershipOf(user.id)) {
      throw new ForbiddenException('No perteneces a la familia de este ticket.');
    }

    return true;
  }
}
