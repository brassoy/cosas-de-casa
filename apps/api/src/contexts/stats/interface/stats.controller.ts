import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { StatsDto, LeaderboardEntryDto } from '@cosasdecasa/contracts';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';
import { FamilyStatsQuery } from '../application/family-stats.query';

/**
 * Controller del contexto `stats`.
 *
 * GET /api/v1/families/:familyId/stats        → dashboard de estadísticas
 * GET /api/v1/families/:familyId/leaderboard  → ranking por puntos
 */
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FamilyScopeGuard)
@Controller('families/:familyId')
@ApiTags('stats')
export class StatsController {
  constructor(private readonly statsQuery: FamilyStatsQuery) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard de estadísticas del hogar.' })
  @ApiOkResponse({ description: 'Estadísticas de la familia.' })
  async getStats(
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<StatsDto> {
    return this.statsQuery.getStats(familyId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Ranking de puntos de la familia.' })
  @ApiOkResponse({ description: 'Ranking ordenado por puntos descendentes.' })
  async getLeaderboard(
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<LeaderboardEntryDto[]> {
    const stats = await this.statsQuery.getMemberStats(familyId);

    return stats
      .sort((a, b) => b.points - a.points)
      .map((m, idx) => ({
        rank: idx + 1,
        userId: m.userId,
        displayName: m.displayName,
        email: m.email,
        points: m.points,
        badges: m.badges,
      }));
  }
}
