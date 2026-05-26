import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from '../domain/ports/push-subscription.repository';
import {
  NOTIFICATION_SENDER,
  type NotificationSenderPort,
} from '../domain/ports/notification-sender.port';
import {
  FRIDGE_ITEM_REPOSITORY,
  type FridgeItemRepository,
} from '../../fridge/domain/ports/fridge-item.repository';
import {
  TASK_REPOSITORY,
  type TaskRepository,
} from '../../tasks/domain/ports/task.repository';

/**
 * Servicio cron que envía recordatorios diarios a las 08:00 (UTC).
 *
 * - Ítems de nevera que caducan en ≤2 días.
 * - Tareas no completadas con deadline hoy o mañana.
 *
 * Tolera 0 suscripciones y errores de envío individuales.
 */
@Injectable()
export class ExpiryReminderService {
  private readonly logger = new Logger(ExpiryReminderService.name);

  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: PushSubscriptionRepository,
    @Inject(NOTIFICATION_SENDER)
    private readonly sender: NotificationSenderPort,
    @Inject(FRIDGE_ITEM_REPOSITORY)
    private readonly fridgeItems: FridgeItemRepository,
    @Inject(TASK_REPOSITORY)
    private readonly taskRepo: TaskRepository,
  ) {}

  /** Diario a las 08:00 UTC. */
  @Cron('0 8 * * *')
  async sendExpiryReminders(): Promise<void> {
    this.logger.log('Iniciando recordatorios de caducidad y tareas urgentes…');
    try {
      await this.processReminders();
    } catch (err) {
      this.logger.error('Error en el cron de recordatorios:', err);
    }
  }

  /** Extraído para tests: puede llamarse directamente. */
  async processReminders(): Promise<void> {
    const familyIds = await this.subscriptions.findAllFamilyIds();
    if (familyIds.length === 0) return;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const tomorrowStr = new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10);

    for (const familyId of familyIds) {
      try {
        await this.processFamily(familyId, todayStr, tomorrowStr);
      } catch (err) {
        this.logger.warn(`Error procesando familia ${familyId}:`, err);
      }
    }
  }

  private async processFamily(
    familyId: string,
    todayStr: string,
    tomorrowStr: string,
  ): Promise<void> {
    const subs = await this.subscriptions.findByFamily(familyId);
    if (subs.length === 0) return;

    const targets = subs.map((s) => ({ endpoint: s.endpoint, keys: s.keys }));

    // ── Nevera: ítems que caducan en ≤2 días ─────────────────────────────────
    const expiring = await this.fridgeItems.findExpiringSoon(familyId, 2);
    if (expiring.length > 0) {
      const names = expiring.map((i) => i.name).join(', ');
      await this.sender
        .sendToTargets(targets, {
          title: 'Productos próximos a caducar',
          body: `Estos productos caducan pronto: ${names}`,
          url: '/fridge',
        })
        .catch((err) => this.logger.warn('Error enviando push de nevera:', err));
    }

    // ── Tareas: deadline hoy o mañana y no completadas ────────────────────────
    const allTasks = await this.taskRepo.findByFamily(familyId);
    const urgentTasks = allTasks.filter(
      (t) =>
        t.status !== 'DONE' &&
        t.deadlineDate !== null &&
        (t.deadlineDate === todayStr || t.deadlineDate === tomorrowStr),
    );
    if (urgentTasks.length > 0) {
      const titles = urgentTasks.map((t) => t.title).join(', ');
      await this.sender
        .sendToTargets(targets, {
          title: 'Tareas pendientes urgentes',
          body: `Estas tareas vencen pronto: ${titles}`,
          url: '/tasks',
        })
        .catch((err) => this.logger.warn('Error enviando push de tareas:', err));
    }
  }
}
