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
import type {
  CoupleDto,
  CoupleNoteDto,
  CoupleChallengeDto,
  ChallengeCatalogDto,
} from '@cosasdecasa/contracts';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';

import { CreateCoupleUseCase } from '../application/create-couple.use-case';
import { GetMyCoupleUseCase } from '../application/get-my-couple.use-case';
import { DissolveCoupleUseCase } from '../application/dissolve-couple.use-case';
import { CreateCoupleNoteUseCase } from '../application/create-couple-note.use-case';
import { ListCoupleNotesUseCase } from '../application/list-couple-notes.use-case';
import { DeleteCoupleNoteUseCase } from '../application/delete-couple-note.use-case';
import { AddChallengeUseCase } from '../application/add-challenge.use-case';
import { ListChallengesUseCase } from '../application/list-challenges.use-case';
import { ListChallengeCatalogUseCase } from '../application/list-challenge-catalog.use-case';
import { MarkChallengeDoneUseCase } from '../application/mark-challenge-done.use-case';
import { DoMischiefUseCase } from '../application/do-mischief.use-case';

import { RomanticPresenter } from './romantic.presenter';
import { RomanticErrorFilter } from './romantic-error.filter';
import { CoupleScopeGuard } from './couple-scope.guard';

import { CreateCoupleDto } from './dto/create-couple.dto';
import { CreateCoupleNoteDto } from './dto/create-couple-note.dto';
import { AddChallengeDto } from './dto/add-challenge.dto';

/**
 * Controller del contexto `romantic`.
 *
 * - Rutas familia: POST/GET /api/v1/families/:familyId/couple (crear/obtener mi pareja)
 * - Rutas pareja: /api/v1/couples/:coupleId/{notes,challenges,mischief} (CoupleScopeGuard)
 */
@ApiBearerAuth()
@UseFilters(RomanticErrorFilter)
@UseGuards(JwtAuthGuard)
@Controller()
@ApiTags('romantic')
export class RomanticController {
  constructor(
    private readonly createCouple: CreateCoupleUseCase,
    private readonly getMyCouple: GetMyCoupleUseCase,
    private readonly dissolveCouple: DissolveCoupleUseCase,
    private readonly createNote: CreateCoupleNoteUseCase,
    private readonly listNotes: ListCoupleNotesUseCase,
    private readonly deleteNote: DeleteCoupleNoteUseCase,
    private readonly addChallenge: AddChallengeUseCase,
    private readonly listChallenges: ListChallengesUseCase,
    private readonly listChallengeCatalog: ListChallengeCatalogUseCase,
    private readonly markDone: MarkChallengeDoneUseCase,
    private readonly doMischief: DoMischiefUseCase,
  ) {}

  // ── Catálogo de retos (estático, sin pareja) ──────────────────────────────

  @Get('couples/challenge-catalog')
  @ApiOperation({ summary: 'Listar el catálogo de retos disponibles para añadir.' })
  @ApiOkResponse({ description: 'Catálogo de retos (key + descripción).' })
  getChallengeCatalogHandler(): ChallengeCatalogDto {
    return this.listChallengeCatalog.execute().map(RomanticPresenter.toCatalogEntryDto);
  }

  // ── Rutas de familia ──────────────────────────────────────────────────────

  @Post('families/:familyId/couple')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Crear una pareja dentro de una familia.' })
  @ApiCreatedResponse({ description: 'Pareja creada.' })
  async createCoupleHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: CreateCoupleDto,
  ): Promise<CoupleDto> {
    const couple = await this.createCouple.execute({
      familyId,
      userA: user.id,
      userB: body.partnerUserId,
    });
    return RomanticPresenter.toCoupleDto(couple);
  }

  @Get('families/:familyId/couple')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Obtener la pareja del usuario autenticado en una familia.' })
  @ApiOkResponse({ description: 'Pareja del usuario.' })
  async getMyCoupleHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<CoupleDto> {
    const couple = await this.getMyCouple.execute({ familyId, userId: user.id });
    return RomanticPresenter.toCoupleDto(couple);
  }

  // ── Rutas de pareja (CoupleScopeGuard) ────────────────────────────────────

  @Delete('couples/:coupleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CoupleScopeGuard)
  @ApiOperation({ summary: 'Disolver la pareja (solo sus miembros). Borra notas y retos.' })
  @ApiNoContentResponse({ description: 'Pareja disuelta.' })
  async dissolveCoupleHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('coupleId', ParseUUIDPipe) coupleId: string,
  ): Promise<void> {
    await this.dissolveCouple.execute({ coupleId, userId: user.id });
  }

  @Post('couples/:coupleId/notes')
  @UseGuards(CoupleScopeGuard)
  @ApiOperation({ summary: 'Añadir una nota de pareja.' })
  @ApiCreatedResponse({ description: 'Nota creada.' })
  async createNoteHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('coupleId', ParseUUIDPipe) coupleId: string,
    @Body() body: CreateCoupleNoteDto,
  ): Promise<CoupleNoteDto> {
    const note = await this.createNote.execute({
      coupleId,
      authorId: user.id,
      body: body.body,
    });
    return RomanticPresenter.toNoteDto(note);
  }

  @Get('couples/:coupleId/notes')
  @UseGuards(CoupleScopeGuard)
  @ApiOperation({ summary: 'Listar las notas de la pareja (orden cronológico).' })
  @ApiOkResponse({ description: 'Lista de notas.' })
  async listNotesHandler(
    @Param('coupleId', ParseUUIDPipe) coupleId: string,
  ): Promise<CoupleNoteDto[]> {
    const notes = await this.listNotes.execute({ coupleId });
    return notes.map(RomanticPresenter.toNoteDto);
  }

  @Delete('couples/:coupleId/notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CoupleScopeGuard)
  @ApiOperation({ summary: 'Borrar una nota de la pareja.' })
  @ApiNoContentResponse({ description: 'Nota borrada.' })
  async deleteNoteHandler(
    @Param('coupleId', ParseUUIDPipe) coupleId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ): Promise<void> {
    await this.deleteNote.execute({ coupleId, noteId });
  }

  @Post('couples/:coupleId/challenges')
  @UseGuards(CoupleScopeGuard)
  @ApiOperation({ summary: 'Añadir un reto del catálogo a la lista de la pareja.' })
  @ApiCreatedResponse({ description: 'Reto añadido.' })
  async addChallengeHandler(
    @Param('coupleId', ParseUUIDPipe) coupleId: string,
    @Body() body: AddChallengeDto,
  ): Promise<CoupleChallengeDto> {
    const challenge = await this.addChallenge.execute({
      coupleId,
      challengeKey: body.challengeKey,
    });
    return RomanticPresenter.toChallengeDto(challenge);
  }

  @Get('couples/:coupleId/challenges')
  @UseGuards(CoupleScopeGuard)
  @ApiOperation({ summary: 'Listar los retos de la pareja.' })
  @ApiOkResponse({ description: 'Lista de retos.' })
  async listChallengesHandler(
    @Param('coupleId', ParseUUIDPipe) coupleId: string,
  ): Promise<CoupleChallengeDto[]> {
    const challenges = await this.listChallenges.execute({ coupleId });
    return challenges.map(RomanticPresenter.toChallengeDto);
  }

  @Post('couples/:coupleId/challenges/done')
  @UseGuards(CoupleScopeGuard)
  @ApiOperation({ summary: 'Marcar un reto como completado.' })
  @ApiOkResponse({ description: 'Reto marcado como completado.' })
  async markChallengeDoneHandler(
    @Param('coupleId', ParseUUIDPipe) coupleId: string,
    @Body() body: AddChallengeDto,
  ): Promise<CoupleChallengeDto> {
    const challenge = await this.markDone.execute({
      coupleId,
      challengeKey: body.challengeKey,
    });
    return RomanticPresenter.toChallengeDto(challenge);
  }

  @Post('couples/:coupleId/mischief')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CoupleScopeGuard)
  @ApiOperation({ summary: '¡Hacer maldad! Envía una notificación push divertida a tu pareja.' })
  @ApiNoContentResponse({ description: 'Maldad enviada.' })
  async doMischiefHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('coupleId', ParseUUIDPipe) coupleId: string,
  ): Promise<void> {
    await this.doMischief.execute({ coupleId, senderId: user.id });
  }
}
