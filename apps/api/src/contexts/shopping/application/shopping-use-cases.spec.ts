/**
 * Tests unitarios de los casos de uso del contexto `shopping`.
 *
 * Usan repositorios en memoria (fake) para aislar la lógica de aplicación.
 *
 * Cobertura:
 *  ✓ EnsureAndListLists: crea la MAIN si no existe
 *  ✓ EnsureAndListLists: no recrea la MAIN si ya existe
 *  ✓ CreateCustomList: crea una lista CUSTOM
 *  ✓ AddItem: añade un ítem a una lista existente
 *  ✓ AddItem: lanza ListNotFoundError si la lista no existe
 *  ✓ AddItemToList: SUGGEST solo si hay un ítem PENDIENTE igual en la lista actual
 *    (el catálogo histórico NO decide; forceAdd salta la sugerencia)
 *  ✓ ToggleItemChecked: invierte el estado checked
 *  ✓ ToggleItemChecked: lanza ItemNotFoundError si no existe el ítem
 *  ✓ DeleteCustomList: borra una lista CUSTOM
 *  ✓ DeleteCustomList: lanza CannotDeleteMainListError para la MAIN
 */
import { describe, expect, it, beforeEach } from 'vitest';
import type { ShoppingListRepository } from '../domain/ports/shopping-list.repository';
import type { ShoppingItemRepository } from '../domain/ports/shopping-item.repository';
import type { ItemCommentRepository } from '../domain/ports/item-comment.repository';
import type { ShoppingClock } from './ports/clock';
import type { ShoppingIdGenerator } from './ports/id-generator';
import { ShoppingList, ShoppingItem, ItemComment } from '../domain/shopping-list';
import {
  CannotDeleteMainListError,
  ItemNotFoundError,
  ListNotFoundError,
} from '../domain/shopping.errors';
import { EnsureAndListListsUseCase } from './ensure-and-list-lists.use-case';
import { CreateCustomListUseCase } from './create-custom-list.use-case';
import { AddItemUseCase } from './add-item.use-case';
import { AddItemToListUseCase } from './add-item-to-list.use-case';
import { ToggleItemCheckedUseCase } from './toggle-item-checked.use-case';
import { DeleteCustomListUseCase } from './delete-custom-list.use-case';
import type { UpsertCatalogItemUseCase } from '../../ai/application/upsert-catalog-item.use-case';

// ── Fakes ──────────────────────────────────────────────────────────────────

let listStore: ShoppingList[] = [];
let itemStore: ShoppingItem[] = [];
let commentStore: ItemComment[] = [];
let idCounter = 0;
const FIXED_NOW = new Date('2026-05-26T10:00:00Z');

const fakeClock: ShoppingClock = { now: () => FIXED_NOW };
const fakeIds: ShoppingIdGenerator = { generate: () => `id-${++idCounter}` };

const fakeListRepo: ShoppingListRepository = {
  async create(list) { listStore.push(list); },
  async findById(id) { return listStore.find((l) => l.id === id) ?? null; },
  async findMainByFamily(fid) { return listStore.find((l) => l.familyId === fid && l.isMain) ?? null; },
  async findByFamily(fid) { return listStore.filter((l) => l.familyId === fid); },
  async deleteById(id) { listStore = listStore.filter((l) => l.id !== id); },
};

const fakeItemRepo: ShoppingItemRepository = {
  async create(item) { itemStore.push(item); },
  async findById(id) { return itemStore.find((i) => i.id === id) ?? null; },
  async findByList(lid) { return itemStore.filter((i) => i.listId === lid); },
  async update(item) {
    const idx = itemStore.findIndex((i) => i.id === item.id);
    if (idx !== -1) { itemStore[idx] = item; }
  },
  async deleteById(id) { itemStore = itemStore.filter((i) => i.id !== id); },
};

const fakeCommentRepo: ItemCommentRepository = {
  async create(c) { commentStore.push(c); },
  async findByItem(id) { return commentStore.filter((c) => c.itemId === id); },
};

// ── Setup ──────────────────────────────────────────────────────────────────

function makeUseCases() {
  return {
    ensureAndList: new EnsureAndListListsUseCase(fakeListRepo, fakeClock, fakeIds),
    createCustom: new CreateCustomListUseCase(fakeListRepo, fakeClock, fakeIds),
    addItem: new AddItemUseCase(fakeListRepo, fakeItemRepo, fakeClock, fakeIds),
    toggleChecked: new ToggleItemCheckedUseCase(fakeItemRepo, fakeClock),
    deleteList: new DeleteCustomListUseCase(fakeListRepo),
  };
}

beforeEach(() => {
  listStore = [];
  itemStore = [];
  commentStore = [];
  idCounter = 0;
});

// ── EnsureAndListLists ────────────────────────────────────────────────────────

describe('EnsureAndListListsUseCase', () => {
  it('crea la lista MAIN si la familia no tiene ninguna', async () => {
    const { ensureAndList } = makeUseCases();
    const result = await ensureAndList.execute({ familyId: 'fam-1', actingUserId: 'user-1' });

    expect(result).toHaveLength(1);
    expect(result[0].isMain).toBe(true);
    expect(listStore).toHaveLength(1);
  });

  it('no duplica la MAIN si ya existe', async () => {
    const { ensureAndList } = makeUseCases();
    await ensureAndList.execute({ familyId: 'fam-1', actingUserId: 'user-1' });
    await ensureAndList.execute({ familyId: 'fam-1', actingUserId: 'user-1' });

    const mains = listStore.filter((l) => l.isMain && l.familyId === 'fam-1');
    expect(mains).toHaveLength(1);
  });

  it('devuelve también las listas CUSTOM existentes', async () => {
    const { ensureAndList, createCustom } = makeUseCases();
    await ensureAndList.execute({ familyId: 'fam-1', actingUserId: 'user-1' });
    await createCustom.execute({ familyId: 'fam-1', name: 'Navidad', actingUserId: 'user-1' });

    const result = await ensureAndList.execute({ familyId: 'fam-1', actingUserId: 'user-1' });
    expect(result).toHaveLength(2);
  });
});

// ── CreateCustomList ──────────────────────────────────────────────────────────

describe('CreateCustomListUseCase', () => {
  it('crea una lista CUSTOM con el nombre indicado', async () => {
    const { createCustom } = makeUseCases();
    const list = await createCustom.execute({
      familyId: 'fam-1',
      name: 'Barbacoa de verano',
      actingUserId: 'user-1',
    });

    expect(list.type).toBe('CUSTOM');
    expect(list.name).toBe('Barbacoa de verano');
    expect(list.familyId).toBe('fam-1');
  });
});

// ── AddItem ───────────────────────────────────────────────────────────────────

describe('AddItemUseCase', () => {
  it('añade un ítem a una lista existente', async () => {
    const { ensureAndList, addItem } = makeUseCases();
    const [list] = await ensureAndList.execute({ familyId: 'fam-1', actingUserId: 'user-1' });

    const item = await addItem.execute({
      listId: list.id,
      actingUserId: 'user-1',
      name: 'Leche entera',
      quantity: 2,
      unit: 'l',
    });

    expect(item.name).toBe('Leche entera');
    expect(item.quantity).toBe(2);
    expect(item.checked).toBe(false);
  });

  it('lanza ListNotFoundError si la lista no existe', async () => {
    const { addItem } = makeUseCases();
    await expect(
      addItem.execute({ listId: 'nonexistent', actingUserId: 'user-1', name: 'Pan' }),
    ).rejects.toThrow(ListNotFoundError);
  });
});

// ── AddItemToList (dedup contra la lista actual) ─────────────────────────────

describe('AddItemToListUseCase', () => {
  /** Catálogo histórico simulado: registra los upserts pero NUNCA decide. */
  let catalogUpserts: Array<{ familyId: string; displayName: string }>;

  function makeAddItemToList() {
    catalogUpserts = [];
    const upsertCatalogStub = {
      execute: async (cmd: { familyId: string; displayName: string }) => {
        catalogUpserts.push(cmd);
      },
    } as unknown as UpsertCatalogItemUseCase;

    const addItem = new AddItemUseCase(fakeListRepo, fakeItemRepo, fakeClock, fakeIds);
    return new AddItemToListUseCase(fakeItemRepo, addItem, upsertCatalogStub);
  }

  async function makeList(): Promise<string> {
    const ensureAndList = new EnsureAndListListsUseCase(fakeListRepo, fakeClock, fakeIds);
    const [list] = await ensureAndList.execute({ familyId: 'fam-1', actingUserId: 'user-1' });
    return list.id;
  }

  it('con la lista vacía NUNCA sugiere, aunque el catálogo histórico tenga "leche"', async () => {
    const useCase = makeAddItemToList();
    const listId = await makeList();
    // Simula historial: "leche" ya pasó por el catálogo de la familia en el pasado.
    catalogUpserts.push({ familyId: 'fam-1', displayName: 'leche' });

    const result = await useCase.execute({
      listId,
      familyId: 'fam-1',
      actingUserId: 'user-1',
      name: 'leche',
    });

    expect(result.decision).toBe('ADD_NEW');
    expect(result.item).toBeDefined();
    expect(result.candidates).toBeUndefined();
    expect(itemStore).toHaveLength(1);
  });

  it('sugiere (SUGGEST) si hay un ítem PENDIENTE con el mismo nombre normalizado', async () => {
    const useCase = makeAddItemToList();
    const listId = await makeList();
    await useCase.execute({ listId, familyId: 'fam-1', actingUserId: 'user-1', name: 'leche' });

    const result = await useCase.execute({
      listId,
      familyId: 'fam-1',
      actingUserId: 'user-1',
      name: 'Leche',
    });

    expect(result.decision).toBe('SUGGEST');
    expect(result.item).toBeUndefined();
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates![0].displayName).toBe('leche');
    expect(result.candidates![0].normalizedName).toBe('leche');
    // No se creó un segundo ítem.
    expect(itemStore).toHaveLength(1);
  });

  it('NO sugiere si el ítem coincidente ya está comprado (checked): se añade normal', async () => {
    const useCase = makeAddItemToList();
    const listId = await makeList();
    const first = await useCase.execute({
      listId,
      familyId: 'fam-1',
      actingUserId: 'user-1',
      name: 'leche',
    });

    // Marcamos "leche" como comprada.
    const toggleChecked = new ToggleItemCheckedUseCase(fakeItemRepo, fakeClock);
    await toggleChecked.execute({ itemId: first.item!.id });

    const result = await useCase.execute({
      listId,
      familyId: 'fam-1',
      actingUserId: 'user-1',
      name: 'Leche',
    });

    expect(result.decision).toBe('ADD_NEW');
    expect(result.item).toBeDefined();
    expect(itemStore).toHaveLength(2);
  });

  it('con forceAdd=true añade aunque exista un duplicado pendiente', async () => {
    const useCase = makeAddItemToList();
    const listId = await makeList();
    await useCase.execute({ listId, familyId: 'fam-1', actingUserId: 'user-1', name: 'leche' });

    const result = await useCase.execute({
      listId,
      familyId: 'fam-1',
      actingUserId: 'user-1',
      name: 'Leche',
      forceAdd: true,
    });

    expect(result.decision).toBe('ADD_NEW');
    expect(itemStore).toHaveLength(2);
  });

  it('sigue alimentando el catálogo (upsert) cada vez que crea un ítem', async () => {
    const useCase = makeAddItemToList();
    const listId = await makeList();

    await useCase.execute({ listId, familyId: 'fam-1', actingUserId: 'user-1', name: 'pan' });
    // El upsert es fire-and-forget: damos un tick para que se resuelva.
    await new Promise((resolve) => setImmediate(resolve));

    expect(catalogUpserts).toEqual([{ familyId: 'fam-1', displayName: 'pan' }]);
  });
});

// ── ToggleItemChecked ─────────────────────────────────────────────────────────

describe('ToggleItemCheckedUseCase', () => {
  it('marca un ítem como checked y luego lo desmarca', async () => {
    const { ensureAndList, addItem, toggleChecked } = makeUseCases();
    const [list] = await ensureAndList.execute({ familyId: 'fam-1', actingUserId: 'user-1' });
    const item = await addItem.execute({ listId: list.id, actingUserId: 'user-1', name: 'Yogur' });

    expect(item.checked).toBe(false);

    const toggled = await toggleChecked.execute({ itemId: item.id });
    expect(toggled.checked).toBe(true);

    const toggled2 = await toggleChecked.execute({ itemId: item.id });
    expect(toggled2.checked).toBe(false);
  });

  it('lanza ItemNotFoundError si el ítem no existe', async () => {
    const { toggleChecked } = makeUseCases();
    await expect(toggleChecked.execute({ itemId: 'ghost' })).rejects.toThrow(ItemNotFoundError);
  });
});

// ── DeleteCustomList ──────────────────────────────────────────────────────────

describe('DeleteCustomListUseCase', () => {
  it('borra una lista CUSTOM', async () => {
    const { createCustom, deleteList } = makeUseCases();
    const list = await createCustom.execute({
      familyId: 'fam-1',
      name: 'Para el camping',
      actingUserId: 'user-1',
    });

    await deleteList.execute({ listId: list.id });
    expect(listStore.find((l) => l.id === list.id)).toBeUndefined();
  });

  it('lanza CannotDeleteMainListError al intentar borrar la MAIN', async () => {
    const { ensureAndList, deleteList } = makeUseCases();
    const [mainList] = await ensureAndList.execute({ familyId: 'fam-1', actingUserId: 'user-1' });

    await expect(deleteList.execute({ listId: mainList.id })).rejects.toThrow(
      CannotDeleteMainListError,
    );
  });

  it('lanza ListNotFoundError si la lista no existe', async () => {
    const { deleteList } = makeUseCases();
    await expect(deleteList.execute({ listId: 'ghost' })).rejects.toThrow(ListNotFoundError);
  });
});
