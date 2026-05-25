import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthMeDto } from '@cosasdecasa/contracts';
import { ListMyFamiliesUseCase } from '../../family/application/list-my-families.use-case';
import { FamilyPresenter } from '../../family/interface/family.presenter';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Controller del contexto identity-access bajo `/api/v1/auth`.
 *
 * `GET /auth/me` devuelve el usuario autenticado (aprovisionado JIT por el
 * guard) y las familias a las que pertenece, con su rol en cada una.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly listMyFamilies: ListMyFamiliesUseCase) {}

  @Get('me')
  @ApiOperation({ summary: 'Usuario autenticado y sus familias.' })
  @ApiOkResponse({ description: 'Datos del usuario y sus familias.' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AuthMeDto> {
    const families = await this.listMyFamilies.execute({ actingUserId: user.id });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      families: families.map((family) => FamilyPresenter.toSummaryDto(family, user.id)),
    };
  }
}
