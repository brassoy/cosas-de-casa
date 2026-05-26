/**
 * Tests unitarios del ExpiryReminderService.
 *
 * Cobertura:
 *  ✓ No envía nada si no hay familias con suscripciones
 *  ✓ Envía push de nevera si hay ítems que caducan pronto
 *  ✓ Envía push de tareas si hay tareas con deadline urgente
 *  ✓ No envía push de tareas si las tareas están DONE
 *  ✓ Tolera errores del sender sin lanzar
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpiryReminderService } from './expiry-reminder.service';
import type { PushSubscriptionRepository } from '../domain/ports/push-subscription.repository';
import type { NotificationSenderPort, NotificationPayload, PushTarget } from '../domain/ports/notification-sender.port';
import type { FridgeItemRepository } from '../../fridge/domain/ports/fridge-item.repository';
import type { TaskRepository } from '../../tasks/domain/ports/task.repository';
import { PushSubscription } from '../domain/push-subscription';
import { FridgeItem } from '../../fridge/domain/fridge-item';
import { Task } from '../../tasks/domain/task';

// ── Helpers para crear datos de prueba ─────────────────────────────────────────

function makeSub(familyId: string): PushSubscription {
  return new PushSubscription(
    'sub-1',
    'user-1',
    familyId,
    'https://push.example.com/endpoint',
    { p256dh: 'pk', auth: 'auth' },
    new Date(),
  );
}

function makeFridgeItem(id: string, expiryDate: string | null = null): FridgeItem {
  return new FridgeItem({
    id,
    familyId: 'family-1',
    name: `Ítem ${id}`,
    quantity: null,
    unit: null,
    location: 'FRIDGE',
    expiryDate,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeTask(
  id: string,
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE',
  deadlineDate: string | null,
): Task {
  return new Task({
    id,
    familyId: 'family-1',
    title: `Tarea ${id}`,
    description: null,
    status,
    recommendedDate: null,
    deadlineDate,
    createdBy: 'user-1',
    assigneeIds: ['user-1'],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// ── Fakes ─────────────────────────────────────────────────────────────────────

let familyIds: string[] = [];
let subsMap: Map<string, PushSubscription[]> = new Map();
let fridgeItemsMap: Map<string, FridgeItem[]> = new Map();
let tasksMap: Map<string, Task[]> = new Map();
let sentMessages: Array<{ targets: PushTarget[]; payload: NotificationPayload }> = [];
let senderShouldFail = false;

const fakeSubs: PushSubscriptionRepository = {
  async save() {},
  async findByUserAndEndpoint() { return null; },
  async findByFamily(fid) { return subsMap.get(fid) ?? []; },
  async deleteByEndpoint() {},
  async findAllFamilyIds() { return familyIds; },
};

const fakeSender: NotificationSenderPort = {
  async sendToTargets(targets, payload) {
    if (senderShouldFail) throw new Error('Fallo simulado del sender');
    sentMessages.push({ targets, payload });
  },
};

const fakeFridge: FridgeItemRepository = {
  async create() {},
  async findById() { return null; },
  async findByFamily() { return []; },
  async findExpiringSoon(familyId) { return fridgeItemsMap.get(familyId) ?? []; },
  async update() {},
  async deleteById() {},
};

const fakeTasks: TaskRepository = {
  async create() {},
  async findById() { return null; },
  async findByFamily(familyId) { return tasksMap.get(familyId) ?? []; },
  async update() {},
  async deleteById() {},
  async setAssignees() {},
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ExpiryReminderService', () => {
  let service: ExpiryReminderService;
  const TODAY = '2026-05-26';
  const TOMORROW = '2026-05-27';

  beforeEach(() => {
    familyIds = [];
    subsMap = new Map();
    fridgeItemsMap = new Map();
    tasksMap = new Map();
    sentMessages = [];
    senderShouldFail = false;

    service = new ExpiryReminderService(
      fakeSubs,
      fakeSender,
      fakeFridge,
      fakeTasks,
    );
  });

  it('no envía nada si no hay familias con suscripciones', async () => {
    await service.processReminders();
    expect(sentMessages).toHaveLength(0);
  });

  it('no envía nada si la familia no tiene suscripciones activas', async () => {
    familyIds = ['family-1'];
    subsMap.set('family-1', []); // 0 subs
    await service.processReminders();
    expect(sentMessages).toHaveLength(0);
  });

  it('envía push de nevera si hay ítems que caducan pronto', async () => {
    familyIds = ['family-1'];
    subsMap.set('family-1', [makeSub('family-1')]);
    fridgeItemsMap.set('family-1', [makeFridgeItem('item-1', TODAY)]);

    await service.processReminders();

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].payload.title).toContain('caducar');
    expect(sentMessages[0].payload.body).toContain('Ítem item-1');
  });

  it('envía push de tareas si hay tareas urgentes no completadas', async () => {
    familyIds = ['family-1'];
    subsMap.set('family-1', [makeSub('family-1')]);
    tasksMap.set('family-1', [makeTask('task-1', 'OPEN', TODAY)]);

    await service.processReminders();

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].payload.title).toContain('urgentes');
  });

  it('no envía push de tareas si están DONE', async () => {
    familyIds = ['family-1'];
    subsMap.set('family-1', [makeSub('family-1')]);
    tasksMap.set('family-1', [makeTask('task-1', 'DONE', TODAY)]);
    fridgeItemsMap.set('family-1', []);

    await service.processReminders();
    expect(sentMessages).toHaveLength(0);
  });

  it('envía dos pushes si hay tanto nevera urgente como tareas urgentes', async () => {
    familyIds = ['family-1'];
    subsMap.set('family-1', [makeSub('family-1')]);
    fridgeItemsMap.set('family-1', [makeFridgeItem('item-1', TOMORROW)]);
    tasksMap.set('family-1', [makeTask('task-1', 'IN_PROGRESS', TOMORROW)]);

    await service.processReminders();
    expect(sentMessages).toHaveLength(2);
  });

  it('tolera errores del sender sin lanzar', async () => {
    familyIds = ['family-1'];
    subsMap.set('family-1', [makeSub('family-1')]);
    fridgeItemsMap.set('family-1', [makeFridgeItem('item-1', TODAY)]);
    senderShouldFail = true;

    await expect(service.processReminders()).resolves.toBeUndefined();
  });
});
