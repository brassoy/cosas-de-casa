import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthMeDto } from '@cosasdecasa/contracts';
import { ListMyFamiliesUseCase } from '../../family/application/list-my-families.use-case';
import { FamilyPresenter } from '../../family/interface/family.presenter';
import { UpdateDisplayNameUseCase } from '../application/update-display-name.use-case';
import { DeleteAccountUseCase } from '../application/delete-account.use-case';
import { ExportPersonalDataUseCase } from '../application/export-personal-data.use-case';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import { CurrentUser } from './current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Controller del contexto identity-access bajo `/api/v1/auth`.
 *
 * `GET /auth/me` devuelve el usuario autenticado (aprovisionado JIT por el
 * guard) y las familias a las que pertenece, con su rol en cada una.
 * `PATCH /auth/me` permite al usuario cambiar su nombre visible (display_name).
 * `DELETE /auth/me` borra la cuenta del usuario de forma permanente.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly listMyFamilies: ListMyFamiliesUseCase,
    private readonly updateDisplayName: UpdateDisplayNameUseCase,
    private readonly deleteAccount: DeleteAccountUseCase,
    private readonly exportPersonalData: ExportPersonalDataUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Usuario autenticado y sus familias.' })
  @ApiOkResponse({ description: 'Datos del usuario y sus familias.' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AuthMeDto> {
    return this.toAuthMeDto(user);
  }

  @Get('me/export')
  @ApiOperation({
    summary: 'Descarga TODOS los datos personales del usuario (GDPR acceso/portabilidad).',
  })
  @ApiOkResponse({ description: 'Volcado serializable de los datos del usuario.' })
  async exportMe(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.exportPersonalData.execute({ userId: user.id });
    return { generatedAt: new Date().toISOString(), userId: user.id, ...data };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Cambia el nombre visible del usuario autenticado.' })
  @ApiOkResponse({ description: 'Datos del usuario actualizados y sus familias.' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<AuthMeDto> {
    const updated = await this.updateDisplayName.execute({
      userId: user.id,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
    });
    return this.toAuthMeDto(updated);
  }

  @Delete('me')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Borra la cuenta del usuario autenticado de forma permanente.',
  })
  @ApiNoContentResponse({ description: 'Cuenta borrada. Sin contenido.' })
  async deleteMe(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.deleteAccount.execute({ userId: user.id });
  }

  /** Compone el AuthMeDto: usuario + listado de familias con su rol. */
  private async toAuthMeDto(user: AuthenticatedUser): Promise<AuthMeDto> {
    const families = await this.listMyFamilies.execute({ actingUserId: user.id });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      families: families.map((family) => FamilyPresenter.toSummaryDto(family, user.id)),
    };
  }
}
