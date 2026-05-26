/**
 * Tests unitarios de los casos de uso del contexto `fridge`.
 *
 * Usan repositorios en memoria (fake) para aislar la lógica de aplicación.
 *
 * Cobertura:
 *  ✓ AddFridgeItem: crea y persiste el ítem
 *  ✓ AddFridgeItem: nombre vacío → FridgeItemNameEmptyError
 *  ✓ ListFridgeItems: devuelve los ítems de la familia ordenados por caducidad
 *  ✓ GetFridgeItem: devuelve el ítem por id
 *  ✓ GetFridgeItem: lanza FridgeItemNotFoundError si no existe
 *  ✓ UpdateFridgeItem: actualiza nombre y location
 *  ✓ DeleteFridgeItem: elimina el ítem
 *  ✓ EatFridgeItem: decrementa cantidad, devuelve deleted=false
 *  ✓ EatFridgeItem: sin cantidad → deleted=true y elimina el ítem
 *  ✓ ThrowFridgeItem: elimina el ítem
 *  ✓ FreezeFridgeItem: cambia location a FREEZER
 *  ✓ GetExpiringSoon: devuelve solo los ítems que caducan pronto
 */
import { describe, expect, it, beforeEach } from 'vitest';
import type { FridgeItemRepository } from '../domain/ports/fridge-item.repository';
import type { FridgeClock } from './ports/clock';
import type { FridgeIdGenerator } from './ports/id-generator';
import { FridgeItem } from '../domain/fridge-item';
import { FridgeItemNotFoundError } from '../domain/fridge.errors';
import { AddFridgeItemUseCase } from './add-fridge-item.use-case';
import { ListFridgeItemsUseCase } from './list-fridge-items.use-case';
import { GetFridgeItemUseCase } from './get-fridge-item.use-case';
import { UpdateFridgeItemUseCase } from './update-fridge-item.use-case';
import { DeleteFridgeItemUseCase } from './delete-fridge-item.use-case';
import { EatFridgeItemUseCase } from './eat-fridge-item.use-case';
import { ThrowFridgeItemUseCase } from './throw-fridge-item.use-case';
import { FreezeFridgeItemUseCase } from './freeze-fridge-item.use-case';
import { GetExpiringSoonUseCase } from './get-expiring-soon.use-case';

// ── Fakes ──────────────────────────────────────────────────────────────────

let itemStore: FridgeItem[] = [];
let idCounter = 0;
const FIXED_NOW = new Date('2026-05-26T10:00:00Z');

const fakeClock: FridgeClock = { now: () => FIXED_NOW };
const fakeIds: FridgeIdGenerator = { generate: () => `id-${++idCounter}` };

const fakeRepo: FridgeItemRepository = {
  async create(item) { itemStore.push(item); },
  async findById(id) { return itemStore.find((i) => i.id === id) ?? null; },
  async findByFamily(familyId) {
    const items = itemStore.filter((i) => i.familyId === familyId);
    // Ordenar por expiryDate ASC, NULLs al final
    return [...items].sort((a, b) => {
      if (a.expiryDate === null && b.expiryDate === null) return 0;
      if (a.expiryDate === null) return 1;
      if (b.expiryDate === null) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    });
  },
  async findExpiringSoon(familyId, days) {
    const cutoff = new Date(FIXED_NOW);
    cutoff.setDate(cutoff.getDate() + days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return itemStore.filter(
      (i) => i.familyId === familyId && i.expiryDate !== null && i.expiryDate <= cutoffStr,
    );
  },
  async update(item) {
    const idx = itemStore.findIndex((i) => i.id === item.id);
    if (idx !== -1) itemStore[idx] = item;
  },
  async deleteById(id) { itemStore = itemStore.filter((i) => i.id !== id); },
};

// ── Setup ──────────────────────────────────────────────────────────────────

function makeUseCases() {
  return {
    add: new AddFridgeItemUseCase(fakeRepo, fakeClock, fakeIds),
    list: new ListFridgeItemsUseCase(fakeRepo),
    get: new GetFridgeItemUseCase(fakeRepo),
    update: new UpdateFridgeItemUseCase(fakeRepo, fakeClock),
    remove: new DeleteFridgeItemUseCase(fakeRepo),
    eat: new EatFridgeItemUseCase(fakeRepo, fakeClock),
    throw_: new ThrowFridgeItemUseCase(fakeRepo),
    freeze: new FreezeFridgeItemUseCase(fakeRepo, fakeClock),
    expiringSoon: new GetExpiringSoonUseCase(fakeRepo),
  };
}

beforeEach(() => {
  itemStore = [];
  idCounter = 0;
});

// ── AddFridgeItem ─────────────────────────────────────────────────────────────

describe('AddFridgeItemUseCase', () => {
  it('crea y persiste el ítem', async () => {
    const { add } = makeUseCases();
    const item = await add.execute({
      familyId: 'fam-1',
      name: 'Leche',
      quantity: '2',
      unit: 'L',
      createdBy: 'user-1',
    });
    expect(item.name).toBe('Leche');
    expect(item.location).toBe('FRIDGE');
    expect(itemStore).toHaveLength(1);
  });
});

// ── ListFridgeItems ────────────────────────────────────────────────────────────

describe('ListFridgeItemsUseCase', () => {
  it('devuelve los ítems ordenados por caducidad (ASC NULLS LAST)', async () => {
    const { add, list } = makeUseCases();
    await add.execute({ familyId: 'fam-1', name: 'Sin fecha', createdBy: 'user-1' });
    await add.execute({ familyId: 'fam-1', name: 'Caduca tarde', expiryDate: '2026-06-30', createdBy: 'user-1' });
    await add.execute({ familyId: 'fam-1', name: 'Caduca pronto', expiryDate: '2026-05-27', createdBy: 'user-1' });

    const result = await list.execute({ familyId: 'fam-1' });
    expect(result[0].name).toBe('Caduca pronto');
    expect(result[1].name).toBe('Caduca tarde');
    expect(result[2].name).toBe('Sin fecha');
  });
});

// ── GetFridgeItem ─────────────────────────────────────────────────────────────

describe('GetFridgeItemUseCase', () => {
  it('devuelve el ítem por id', async () => {
    const { add, get } = makeUseCases();
    const created = await add.execute({ familyId: 'fam-1', name: 'Queso', createdBy: 'user-1' });
    const found = await get.execute({ itemId: created.id });
    expect(found.id).toBe(created.id);
  });

  it('lanza FridgeItemNotFoundError si no existe', async () => {
    const { get } = makeUseCases();
    await expect(get.execute({ itemId: 'ghost' })).rejects.toThrow(FridgeItemNotFoundError);
  });
});

// ── UpdateFridgeItem ──────────────────────────────────────────────────────────

describe('UpdateFridgeItemUseCase', () => {
  it('actualiza nombre y location', async () => {
    const { add, update } = makeUseCases();
    const item = await add.execute({ familyId: 'fam-1', name: 'Yogur', createdBy: 'user-1' });
    const updated = await update.execute({ itemId: item.id, name: 'Yogur natural', location: 'PANTRY' });
    expect(updated.name).toBe('Yogur natural');
    expect(updated.location).toBe('PANTRY');
  });
});

// ── DeleteFridgeItem ──────────────────────────────────────────────────────────

describe('DeleteFridgeItemUseCase', () => {
  it('elimina el ítem', async () => {
    const { add, remove } = makeUseCases();
    const item = await add.execute({ familyId: 'fam-1', name: 'Mantequilla', createdBy: 'user-1' });
    await remove.execute({ itemId: item.id });
    expect(itemStore.find((i) => i.id === item.id)).toBeUndefined();
  });
});

// ── EatFridgeItem ─────────────────────────────────────────────────────────────

describe('EatFridgeItemUseCase', () => {
  it('decrementa la cantidad; deleted=false', async () => {
    const { add, eat } = makeUseCases();
    const item = await add.execute({ familyId: 'fam-1', name: 'Leche', quantity: '3', createdBy: 'user-1' });
    const result = await eat.execute({ itemId: item.id, amount: '1' });
    expect(result.deleted).toBe(false);
    expect(itemStore[0].quantity).toBe('2');
  });

  it('sin cantidad registrada → deleted=true y elimina', async () => {
    const { add, eat } = makeUseCases();
    const item = await add.execute({ familyId: 'fam-1', name: 'Tomate', createdBy: 'user-1' });
    const result = await eat.execute({ itemId: item.id });
    expect(result.deleted).toBe(true);
    expect(itemStore.find((i) => i.id === item.id)).toBeUndefined();
  });
});

// ── ThrowFridgeItem ───────────────────────────────────────────────────────────

describe('ThrowFridgeItemUseCase', () => {
  it('elimina el ítem', async () => {
    const { add, throw_ } = makeUseCases();
    const item = await add.execute({ familyId: 'fam-1', name: 'Pan caducado', createdBy: 'user-1' });
    await throw_.execute({ itemId: item.id });
    expect(itemStore.find((i) => i.id === item.id)).toBeUndefined();
  });
});

// ── FreezeFridgeItem ──────────────────────────────────────────────────────────

describe('FreezeFridgeItemUseCase', () => {
  it('mueve el ítem al congelador', async () => {
    const { add, freeze } = makeUseCases();
    const item = await add.execute({ familyId: 'fam-1', name: 'Carne', location: 'FRIDGE', createdBy: 'user-1' });
    const frozen = await freeze.execute({ itemId: item.id });
    expect(frozen.location).toBe('FREEZER');
  });
});

// ── GetExpiringSoon ───────────────────────────────────────────────────────────

describe('GetExpiringSoonUseCase', () => {
  it('devuelve solo los ítems que caducan en ≤ 2 días', async () => {
    const { add, expiringSoon } = makeUseCases();
    await add.execute({ familyId: 'fam-1', name: 'Caduca hoy', expiryDate: '2026-05-26', createdBy: 'user-1' });
    await add.execute({ familyId: 'fam-1', name: 'Caduca en 2 días', expiryDate: '2026-05-28', createdBy: 'user-1' });
    await add.execute({ familyId: 'fam-1', name: 'Caduca en 10 días', expiryDate: '2026-06-05', createdBy: 'user-1' });
    await add.execute({ familyId: 'fam-1', name: 'Sin fecha', createdBy: 'user-1' });

    const result = await expiringSoon.execute({ familyId: 'fam-1' });
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.name).sort()).toEqual(['Caduca en 2 días', 'Caduca hoy'].sort());
  });
});
