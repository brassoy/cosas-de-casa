import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../identity-access/domain/authenticated-user';
import { CurrentUser } from '../../identity-access/interface/current-user.decorator';
import { JwtAuthGuard } from '../../identity-access/interface/jwt-auth.guard';
import { FamilyScopeGuard } from '../../family/interface/family-scope.guard';
import { SubscribePushUseCase } from '../application/subscribe-push.use-case';
import { UnsubscribePushUseCase } from '../application/unsubscribe-push.use-case';
import {
  NOTIFICATIONS_ID_GENERATOR,
  type NotificationsIdGenerator,
} from '../application/ports/id-generator';
import {
  NOTIFICATIONS_CLOCK,
  type NotificationsClock,
} from '../application/ports/clock';
import { SubscribePushDto, UnsubscribePushDto } from './dto/subscribe-push.dto';

/**
 * Controller del contexto `notifications`.
 *
 * POST   /api/v1/families/:familyId/notifications/subscribe
 * DELETE /api/v1/families/:familyId/notifications/subscribe
 */
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('families/:familyId/notifications')
@ApiTags('notifications')
export class NotificationsController {
  constructor(
    private readonly subscribePush: SubscribePushUseCase,
    private readonly unsubscribePush: UnsubscribePushUseCase,
    @Inject(NOTIFICATIONS_ID_GENERATOR) private readonly ids: NotificationsIdGenerator,
    @Inject(NOTIFICATIONS_CLOCK) private readonly clock: NotificationsClock,
  ) {}

  @Post('subscribe')
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Registrar suscripción Web Push para la familia.' })
  @ApiCreatedResponse({ description: 'Suscripción guardada.' })
  async subscribeHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() body: SubscribePushDto,
  ): Promise<{ id: string }> {
    const sub = await this.subscribePush.execute({
      id: this.ids.generate(),
      userId: user.id,
      familyId,
      endpoint: body.endpoint,
      keys: body.keys,
      createdAt: this.clock.now(),
    });
    return { id: sub.id };
  }

  @Delete('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(FamilyScopeGuard)
  @ApiOperation({ summary: 'Eliminar suscripción Web Push.' })
  @ApiNoContentResponse({ description: 'Suscripción eliminada.' })
  async unsubscribeHandler(
    @Param('familyId', ParseUUIDPipe) _familyId: string,
    @Body() body: UnsubscribePushDto,
  ): Promise<void> {
    await this.unsubscribePush.execute({ endpoint: body.endpoint });
  }
}
