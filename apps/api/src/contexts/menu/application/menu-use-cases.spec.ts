/**
 * Tests unitarios de los casos de uso del contexto `menu`.
 *
 * Cobertura:
 *  ✓ SuggestMenuUseCase: delega en el puerto de sugerencia con los ítems de la nevera
 *  ✓ SuggestMenuUseCase: lanza MenuAiUnavailableError si el puerto falla
 *  ✓ GenerateListFromMenuUseCase: añade los ingredientes a la lista principal (sin IA)
 *  ✓ GenerateListFromMenuUseCase: usa listId si se proporciona y es válida
 *  ✓ GenerateListFromMenuUseCase: ignora ingredientes vacíos
 */
import { describe, expect, it, beforeEach } from 'vitest';
import type { FridgeItemRepository } from '../../fridge/domain/ports/fridge-item.repository';
import type { ShoppingListRepository } from '../../shopping/domain/ports/shopping-list.repository';
import type { ShoppingItemRepository } from '../../shopping/domain/ports/shopping-item.repository';
import type { MenuSuggestionPort, SuggestMenuResult } from '../domain/ports/menu-suggestion.port';
import { MenuAiUnavailableError } from '../domain/menu.errors';
import { FridgeItem } from '../../fridge/domain/fridge-item';
import { ShoppingList } from '../../shopping/domain/shopping-list';
import { ShoppingItem } from '../../shopping/domain/shopping-list';
import { SuggestMenuUseCase } from './suggest-menu.use-case';
import { GenerateListFromMenuUseCase } from './generate-list-from-menu.use-case';
import { AddItemUseCase } from '../../shopping/application/add-item.use-case';
import { EnsureAndListListsUseCase } from '../../shopping/application/ensure-and-list-lists.use-case';
import type { ShoppingClock } from '../../shopping/application/ports/clock';
import type { ShoppingIdGenerator } from '../../shopping/application/ports/id-generator';

// ── Fakes ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-05-26T10:00:00Z');
let idCounter = 0;

const fakeClock: ShoppingClock = { now: () => NOW };
const fakeIds: ShoppingIdGenerator = { generate: () => `id-${++idCounter}` };

function makeFridgeItem(name: string): FridgeItem {
  return new FridgeItem({
    id: `fridge-${name}`,
    familyId: 'fam-1',
    name,
    quantity: null,
    unit: null,
    location: 'FRIDGE',
    expiryDate: null,
    createdBy: 'user-1',
    createdAt: NOW,
    updatedAt: NOW,
  });
}

const mockMainList = ShoppingList.createMain(
  { id: 'list-main', familyId: 'fam-1', createdBy: 'user-1', now: NOW },
  null,
);

let itemStore: ShoppingItem[] = [];

const fakeFridgeRepo: FridgeItemRepository = {
  async create() {},
  async findById() { return null; },
  async findByFamily() { return [makeFridgeItem('Leche'), makeFridgeItem('Pollo'), makeFridgeItem('Patatas')]; },
  async findExpiringSoon() { return []; },
  async update() {},
  async deleteById() {},
};

const fakeListRepo: ShoppingListRepository = {
  async create() {},
  async findById(id) {
    if (id === 'list-main') return mockMainList;
    return null;
  },
  async findByFamily() { return [mockMainList]; },
  async update() {},
  async deleteById() {},
};

const fakeItemRepo: ShoppingItemRepository = {
  async create(item) { itemStore.push(item); },
  async findById(id) { return itemStore.find((i) => i.id === id) ?? null; },
  async findByList(listId) { return itemStore.filter((i) => i.listId === listId); },
  async update(item) {
    const idx = itemStore.findIndex((i) => i.id === item.id);
    if (idx !== -1) itemStore[idx] = item;
  },
  async deleteById(id) { itemStore = itemStore.filter((i) => i.id !== id); },
};

function makeMenuUseCases() {
  const addItem = new AddItemUseCase(fakeListRepo, fakeItemRepo, fakeClock, fakeIds);
  const ensureAndListLists = new EnsureAndListListsUseCase(fakeListRepo, fakeClock, fakeIds);
  const generate = new GenerateListFromMenuUseCase(fakeListRepo, addItem, ensureAndListLists);
  return { addItem, ensureAndListLists, generate };
}

beforeEach(() => {
  itemStore = [];
  idCounter = 0;
});

// ── SuggestMenuUseCase ────────────────────────────────────────────────────────

describe('SuggestMenuUseCase', () => {
  it('delega en el puerto con los ítems de la nevera', async () => {
    let calledWith: { items: string[]; count: number } | null = null;
    const mockPort: MenuSuggestionPort = {
      suggest: async (items, count) => {
        calledWith = { items, count };
        return { dishes: [] };
      },
    };
    const uc = new SuggestMenuUseCase(mockPort, fakeFridgeRepo);
    await uc.execute({ familyId: 'fam-1', dishCount: 3 });
    expect(calledWith?.items).toContain('Leche');
    expect(calledWith?.count).toBe(3);
  });

  it('lanza MenuAiUnavailableError si el puerto falla', async () => {
    const mockPort: MenuSuggestionPort = {
      suggest: async () => { throw new MenuAiUnavailableError('Sin balance'); },
    };
    const uc = new SuggestMenuUseCase(mockPort, fakeFridgeRepo);
    await expect(uc.execute({ familyId: 'fam-1' })).rejects.toThrow(MenuAiUnavailableError);
  });
});

// ── GenerateListFromMenuUseCase ───────────────────────────────────────────────

describe('GenerateListFromMenuUseCase', () => {
  it('añade los ingredientes a la lista principal (sin IA)', async () => {
    const { generate } = makeMenuUseCases();
    const result = await generate.execute({
      familyId: 'fam-1',
      actingUserId: 'user-1',
      ingredients: ['Cebolla', 'Ajo', 'Tomate'],
    });
    expect(result.itemsAdded).toBe(3);
    expect(result.listId).toBe('list-main');
    expect(itemStore).toHaveLength(3);
  });

  it('usa listId si se proporciona y es válida', async () => {
    const { generate } = makeMenuUseCases();
    const result = await generate.execute({
      familyId: 'fam-1',
      actingUserId: 'user-1',
      ingredients: ['Pepino'],
      listId: 'list-main',
    });
    expect(result.listId).toBe('list-main');
  });

  it('ignora ingredientes vacíos y sólo cuenta los válidos', async () => {
    const { generate } = makeMenuUseCases();
    const result = await generate.execute({
      familyId: 'fam-1',
      actingUserId: 'user-1',
      ingredients: ['Espinacas', '', '   ', 'Queso'],
    });
    expect(result.itemsAdded).toBe(2);
    expect(itemStore).toHaveLength(2);
  });
});
