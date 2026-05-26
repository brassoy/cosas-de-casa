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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  GroupSummaryDto,
  GenerateGroupPinResponse,
  GroupMemberDto,
} from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { CreateGroupUseCase } from '../application/create-group.use-case';
import { GenerateGroupJoinPinUseCase } from '../application/generate-group-join-pin.use-case';
import { JoinGroupByPinUseCase } from '../application/join-group-by-pin.use-case';
import { LeaveGroupUseCase } from '../application/leave-group.use-case';
import { ListGroupMembersUseCase } from '../application/list-group-members.use-case';
import { ListMyGroupsUseCase } from '../application/list-my-groups.use-case';
import { RevokeActiveGroupPinUseCase } from '../application/revoke-active-group-pin.use-case';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { GroupDomainErrorFilter } from './group-domain-error.filter';
import { GroupScopeGuard } from './group-scope.guard';
import { GroupPresenter } from './group.presenter';
import { GroupRoles } from './group-roles.decorator';

/**
 * Controller del contexto `groups` bajo `/api/v1/groups`.
 *
 * Seguridad por capas: {@link JwtAuthGuard} autentica; {@link GroupScopeGuard}
 * exige pertenencia a la peña de la ruta y, con `@GroupRoles('OWNER')`, rol
 * de propietario. Los errores de dominio se traducen a HTTP en
 * {@link GroupDomainErrorFilter}.
 */
@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
@UseGuards(JwtAuthGuard)
@UseFilters(GroupDomainErrorFilter)
export class GroupsController {
  constructor(
    private readonly createGroup: CreateGroupUseCase,
    private readonly listMyGroups: ListMyGroupsUseCase,
    private readonly generateJoinPin: GenerateGroupJoinPinUseCase,
    private readonly joinGroupByPin: JoinGroupByPinUseCase,
    private readonly listMembers: ListGroupMembersUseCase,
    private readonly leaveGroup: LeaveGroupUseCase,
    private readonly revokeActivePin: RevokeActiveGroupPinUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una peña (el creador queda como propietario).' })
  @ApiCreatedResponse({ description: 'Peña creada.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateGroupDto,
  ): Promise<GroupSummaryDto> {
    const group = await this.createGroup.execute({
      actingUserId: user.id,
      name: body.name,
      description: body.description,
      imageUrl: body.imageUrl,
    });
    return GroupPresenter.toSummaryDto(group, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar las peñas del usuario autenticado.' })
  @ApiOkResponse({ description: 'Peñas del usuario.' })
  async list(@CurrentUser() user: AuthenticatedUser): Promise<GroupSummaryDto[]> {
    const groupsList = await this.listMyGroups.execute({ actingUserId: user.id });
    return groupsList.map((group) => GroupPresenter.toSummaryDto(group, user.id));
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unirse a una peña con un código de invitación.' })
  @ApiOkResponse({ description: 'Te has unido a la peña.' })
  async join(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: JoinGroupDto,
  ): Promise<{ groupId: string; joined: boolean }> {
    return this.joinGroupByPin.execute({ actingUserId: user.id, code: body.code });
  }

  @Post(':id/join-pins')
  @UseGuards(GroupScopeGuard)
  @GroupRoles('OWNER')
  @ApiOperation({ summary: 'Generar un código de invitación (solo propietario).' })
  @ApiCreatedResponse({ description: 'Código generado (se muestra una sola vez).' })
  async createPin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) groupId: string,
  ): Promise<GenerateGroupPinResponse> {
    const result = await this.generateJoinPin.execute({ actingUserId: user.id, groupId });
    return { code: result.code, expiresAt: result.expiresAt.toISOString() };
  }

  @Get(':id/members')
  @UseGuards(GroupScopeGuard)
  @ApiOperation({ summary: 'Listar los miembros de una peña.' })
  @ApiOkResponse({ description: 'Miembros de la peña.' })
  async members(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) groupId: string,
  ): Promise<GroupMemberDto[]> {
    const { members } = await this.listMembers.execute({ actingUserId: user.id, groupId });
    return members.map((m) => GroupPresenter.toMemberDto(m));
  }

  @Delete(':id/members/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(GroupScopeGuard)
  @ApiOperation({ summary: 'Salir de una peña.' })
  async leave(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) groupId: string,
  ): Promise<void> {
    await this.leaveGroup.execute({ actingUserId: user.id, groupId });
  }

  @Delete(':id/join-pins/active')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(GroupScopeGuard)
  @GroupRoles('OWNER')
  @ApiOperation({ summary: 'Revocar el código de invitación activo (solo propietario).' })
  async revokePin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) groupId: string,
  ): Promise<void> {
    await this.revokeActivePin.execute({ actingUserId: user.id, groupId });
  }
}
