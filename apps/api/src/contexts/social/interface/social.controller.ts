import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import type { FriendFamilyDto, FriendInviteResponse } from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { GenerateFriendInviteUseCase } from '../application/generate-friend-invite.use-case';
import { RedeemFriendInviteUseCase } from '../application/redeem-friend-invite.use-case';
import { ListFriendFamiliesUseCase } from '../application/list-friend-families.use-case';
import { RemoveFriendFamilyUseCase } from '../application/remove-friend-family.use-case';
import { SocialDomainErrorFilter } from './social-domain-error.filter';
import { SocialPresenter } from './social.presenter';
import { RedeemFriendInviteDto } from './dto/redeem-friend-invite.dto';

/**
 * Controller del contexto `social` (familias amigas).
 *
 * Rutas:
 *   POST   /families/:familyId/friend-invites  → FriendInviteResponse (OWNER)
 *   POST   /friends/redeem                     → FriendFamilyDto
 *   GET    /families/:familyId/friends         → FriendFamilyDto[]
 *   DELETE /friends/:linkId                    → 204
 */
@ApiTags('social')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
@UseFilters(SocialDomainErrorFilter)
export class SocialController {
  constructor(
    private readonly generateInvite: GenerateFriendInviteUseCase,
    private readonly redeemInvite: RedeemFriendInviteUseCase,
    private readonly listFriends: ListFriendFamiliesUseCase,
    private readonly removeFriend: RemoveFriendFamilyUseCase,
  ) {}

  @Post('families/:familyId/friend-invites')
  @ApiOperation({ summary: 'Generar un código de invitación de amistad (solo OWNER).' })
  @ApiCreatedResponse({ description: 'Código generado (se muestra una sola vez).' })
  async generateInviteCode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<FriendInviteResponse> {
    const result = await this.generateInvite.execute({ actingUserId: user.id, familyId });
    return { code: result.code, expiresAt: result.expiresAt.toISOString() };
  }

  @Post('friends/redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Canjear un código de invitación de amistad.' })
  @ApiOkResponse({ description: 'Vínculo de amistad creado (o existente si era idempotente).' })
  async redeem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RedeemFriendInviteDto,
  ): Promise<FriendFamilyDto> {
    const result = await this.redeemInvite.execute({
      actingUserId: user.id,
      redeemingFamilyId: body.familyId,
      code: body.code,
    });
    const views = await this.listFriends.execute({
      actingUserId: user.id,
      familyId: body.familyId,
    });
    // Busca el vínculo recién creado/existente en la vista.
    const view = views.find((v) => v.linkId === result.linkId) ?? views[0];
    // Si por alguna razón no lo encuentra (edge case de idempotencia), construye uno minimal.
    if (!view) {
      return {
        linkId: result.linkId,
        familyId: result.fromFamilyId,
        familyName: '',
        since: new Date().toISOString(),
      };
    }
    return SocialPresenter.toFriendFamilyDto(view);
  }

  @Get('families/:familyId/friends')
  @ApiOperation({ summary: 'Listar las familias amigas.' })
  @ApiOkResponse({ description: 'Familias amigas.' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<FriendFamilyDto[]> {
    const views = await this.listFriends.execute({ actingUserId: user.id, familyId });
    return views.map(SocialPresenter.toFriendFamilyDto);
  }

  @Delete('friends/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un vínculo de amistad.' })
  @ApiNoContentResponse({ description: 'Vínculo eliminado.' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ): Promise<void> {
    await this.removeFriend.execute({ actingUserId: user.id, linkId });
  }
}
