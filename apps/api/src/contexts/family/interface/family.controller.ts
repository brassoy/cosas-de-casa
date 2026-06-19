import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  FamilySummaryDto,
  GeneratePinResponse,
  MemberDto,
} from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../../../common/rate-limit.guard';
import { ChangeMemberRoleUseCase } from '../application/change-member-role.use-case';
import { CreateFamilyUseCase } from '../application/create-family.use-case';
import { DeleteFamilyUseCase } from '../application/delete-family.use-case';
import { ExpelMemberUseCase } from '../application/expel-member.use-case';
import { GenerateJoinPinUseCase } from '../application/generate-join-pin.use-case';
import { JoinFamilyByPinUseCase } from '../application/join-family-by-pin.use-case';
import { LeaveFamilyUseCase } from '../application/leave-family.use-case';
import { ListMembersUseCase } from '../application/list-members.use-case';
import { ListMyFamiliesUseCase } from '../application/list-my-families.use-case';
import { RevokeActivePinUseCase } from '../application/revoke-active-pin.use-case';
import { UpdateFamilyUseCase } from '../application/update-family.use-case';
import { ChangeMemberRoleDto } from './dto/change-member-role.dto';
import { CreateFamilyDto } from './dto/create-family.dto';
import { JoinFamilyDto } from './dto/join-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { DomainErrorFilter } from './domain-error.filter';
import { FamilyScopeGuard } from './family-scope.guard';
import { FamilyPresenter } from './family.presenter';
import { Roles } from './roles.decorator';

/**
 * Controller del contexto `family` bajo `/api/v1/families`.
 *
 * Seguridad por capas: {@link JwtAuthGuard} autentica; {@link FamilyScopeGuard}
 * exige pertenencia a la familia de la ruta y, con `@Roles('OWNER')`, rol de
 * propietario. Los errores de dominio se traducen a HTTP en
 * {@link DomainErrorFilter}.
 */
@ApiTags('families')
@ApiBearerAuth()
@Controller('families')
@UseGuards(JwtAuthGuard)
@UseFilters(DomainErrorFilter)
export class FamilyController {
  constructor(
    private readonly createFamily: CreateFamilyUseCase,
    private readonly listMyFamilies: ListMyFamiliesUseCase,
    private readonly generateJoinPin: GenerateJoinPinUseCase,
    private readonly joinFamilyByPin: JoinFamilyByPinUseCase,
    private readonly listMembers: ListMembersUseCase,
    private readonly leaveFamily: LeaveFamilyUseCase,
    private readonly revokeActivePin: RevokeActivePinUseCase,
    private readonly updateFamily: UpdateFamilyUseCase,
    private readonly deleteFamily: DeleteFamilyUseCase,
    private readonly expelMember: ExpelMemberUseCase,
    private readonly changeMemberRole: ChangeMemberRoleUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una familia (el creador queda como propietario).' })
  @ApiCreatedResponse({ description: 'Familia creada.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateFamilyDto,
  ): Promise<FamilySummaryDto> {
    const family = await this.createFamily.execute({
      actingUserId: user.id,
      name: body.name,
      description: body.description,
      imageUrl: body.imageUrl,
    });
    return FamilyPresenter.toSummaryDto(family, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar las familias del usuario autenticado.' })
  @ApiOkResponse({ description: 'Familias del usuario.' })
  async list(@CurrentUser() user: AuthenticatedUser): Promise<FamilySummaryDto[]> {
    const families = await this.listMyFamilies.execute({ actingUserId: user.id });
    return families.map((family) => FamilyPresenter.toSummaryDto(family, user.id));
  }

  @Post('join')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, ttl: 300_000 }) // 5 intentos/5min — anti brute-force del PIN
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unirse a una familia con un código de invitación.' })
  @ApiOkResponse({ description: 'Te has unido a la familia.' })
  async join(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: JoinFamilyDto,
  ): Promise<{ familyId: string; joined: boolean }> {
    return this.joinFamilyByPin.execute({ actingUserId: user.id, code: body.code });
  }

  @Post(':id/join-pins')
  @UseGuards(FamilyScopeGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Generar un código de invitación (solo propietario).' })
  @ApiCreatedResponse({ description: 'Código generado (se muestra una sola vez).' })
  async createPin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) familyId: string,
  ): Promise<GeneratePinResponse> {
    const result = await this.generateJoinPin.execute({ actingUserId: user.id, familyId });
    return { code: result.code, expiresAt: result.expiresAt.toISOString() };
  }

  @Get(':id/members')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Listar los miembros de una familia.' })
  @ApiOkResponse({ description: 'Miembros de la familia.' })
  async members(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) familyId: string,
  ): Promise<MemberDto[]> {
    const { members } = await this.listMembers.execute({ actingUserId: user.id, familyId });
    return members.map((m) => FamilyPresenter.toMemberDto(m));
  }

  @Get(':familyId')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Detalle de una familia (debe ser miembro).' })
  @ApiOkResponse({ description: 'Detalle de la familia.' })
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<FamilySummaryDto> {
    const families = await this.listMyFamilies.execute({ actingUserId: user.id });
    const family = families.find((f) => f.id === familyId);
    if (!family) throw new NotFoundException('Familia no encontrada.');
    return FamilyPresenter.toSummaryDto(family, user.id);
  }

  @Delete(':id/members/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Salir de una familia.' })
  async leave(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) familyId: string,
  ): Promise<void> {
    await this.leaveFamily.execute({ actingUserId: user.id, familyId });
  }

  @Delete(':id/join-pins/active')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FamilyScopeGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Revocar el código de invitación activo (solo propietario).' })
  async revokePin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) familyId: string,
  ): Promise<void> {
    await this.revokeActivePin.execute({ actingUserId: user.id, familyId });
  }

  @Patch(':familyId')
  @UseGuards(FamilyScopeGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Editar nombre y/o descripción de la familia (solo propietario).' })
  @ApiOkResponse({ description: 'Familia actualizada.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: UpdateFamilyDto,
  ): Promise<FamilySummaryDto> {
    const family = await this.updateFamily.execute({
      actingUserId: user.id,
      familyId,
      name: body.name,
      description: body.description,
    });
    return FamilyPresenter.toSummaryDto(family, user.id);
  }

  @Delete(':familyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FamilyScopeGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Borrar la familia y todo su contenido (solo propietario).' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<void> {
    await this.deleteFamily.execute({ actingUserId: user.id, familyId });
  }

  @Patch(':familyId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FamilyScopeGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Cambiar el rol de un miembro OWNER↔MEMBER (solo propietario).' })
  async changeRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() body: ChangeMemberRoleDto,
  ): Promise<void> {
    await this.changeMemberRole.execute({
      actingUserId: user.id,
      familyId,
      targetUserId,
      role: body.role,
    });
  }

  @Delete(':familyId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FamilyScopeGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Expulsar a un miembro de la familia (solo propietario).' })
  async expel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ): Promise<void> {
    await this.expelMember.execute({
      actingUserId: user.id,
      familyId,
      targetUserId,
    });
  }
}
