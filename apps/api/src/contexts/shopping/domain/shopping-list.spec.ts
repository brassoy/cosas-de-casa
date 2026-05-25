/**
 * Tests de dominio del contexto `shopping`.
 *
 * Cobertura:
 *  ✓ ShoppingList: invariante una-MAIN-por-familia
 *  ✓ ShoppingList: assertDeletable prohíbe borrar la MAIN
 *  ✓ ShoppingItem: nombre no puede estar vacío al crear
 *  ✓ ShoppingItem: nombre no puede quedar vacío al actualizar
 *  ✓ ShoppingItem: toggleChecked invierte el estado
 *  ✓ ItemComment: se crea con los valores correctos
 */
import { describe, expect, it } from 'vitest';
import { ShoppingList, ShoppingItem, ItemComment } from './shopping-list';
import {
  CannotDeleteMainListError,
  ItemNameEmptyError,
  MainListAlreadyExistsError,
} from './shopping.errors';

const NOW = new Date('2026-05-26T10:00:00Z');

// ── ShoppingList ──────────────────────────────────────────────────────────────

describe('ShoppingList', () => {
  describe('createMain', () => {
    it('crea la lista MAIN cuando no existe ninguna', () => {
      const list = ShoppingList.createMain(
        { id: 'id-1', familyId: 'fam-1', createdBy: 'user-1', now: NOW },
        null,
      );

      expect(list.type).toBe('MAIN');
      expect(list.name).toBe('Lista principal');
      expect(list.isMain).toBe(true);
    });

    it('lanza MainListAlreadyExistsError si ya existe una MAIN', () => {
      const existing = ShoppingList.createMain(
        { id: 'id-1', familyId: 'fam-1', createdBy: 'user-1', now: NOW },
        null,
      );

      expect(() =>
        ShoppingList.createMain(
          { id: 'id-2', familyId: 'fam-1', createdBy: 'user-1', now: NOW },
          existing,
        ),
      ).toThrow(MainListAlreadyExistsError);
    });
  });

  describe('assertDeletable', () => {
    it('no lanza para una lista CUSTOM', () => {
      const list = ShoppingList.create({
        id: 'id-3',
        familyId: 'fam-1',
        name: 'Lista especial',
        type: 'CUSTOM',
        createdBy: 'user-1',
        now: NOW,
      });

      expect(() => list.assertDeletable()).not.toThrow();
    });

    it('lanza CannotDeleteMainListError para la lista MAIN', () => {
      const list = ShoppingList.createMain(
        { id: 'id-4', familyId: 'fam-1', createdBy: 'user-1', now: NOW },
        null,
      );

      expect(() => list.assertDeletable()).toThrow(CannotDeleteMainListError);
    });
  });
});

// ── ShoppingItem ──────────────────────────────────────────────────────────────

describe('ShoppingItem', () => {
  describe('create', () => {
    it('crea un ítem con checked=false por defecto', () => {
      const item = ShoppingItem.create({
        id: 'item-1',
        listId: 'list-1',
        name: 'Leche',
        createdBy: 'user-1',
        now: NOW,
      });

      expect(item.checked).toBe(false);
      expect(item.name).toBe('Leche');
    });

    it('lanza ItemNameEmptyError si el nombre está vacío', () => {
      expect(() =>
        ShoppingItem.create({
          id: 'item-2',
          listId: 'list-1',
          name: '   ',
          createdBy: 'user-1',
          now: NOW,
        }),
      ).toThrow(ItemNameEmptyError);
    });

    it('recorta espacios del nombre', () => {
      const item = ShoppingItem.create({
        id: 'item-3',
        listId: 'list-1',
        name: '  Pan integral  ',
        createdBy: 'user-1',
        now: NOW,
      });

      expect(item.name).toBe('Pan integral');
    });
  });

  describe('toggleChecked', () => {
    it('marca como checked cuando estaba unchecked', () => {
      const item = ShoppingItem.create({
        id: 'item-4',
        listId: 'list-1',
        name: 'Huevos',
        createdBy: 'user-1',
        now: NOW,
      });

      const laterTime = new Date('2026-05-26T11:00:00Z');
      item.toggleChecked(laterTime);

      expect(item.checked).toBe(true);
      expect(item.updatedAt).toEqual(laterTime);
    });

    it('desmarca cuando estaba checked', () => {
      const item = ShoppingItem.create({
        id: 'item-5',
        listId: 'list-1',
        name: 'Mantequilla',
        createdBy: 'user-1',
        now: NOW,
      });

      const t1 = new Date('2026-05-26T11:00:00Z');
      const t2 = new Date('2026-05-26T12:00:00Z');
      item.toggleChecked(t1);
      item.toggleChecked(t2);

      expect(item.checked).toBe(false);
    });
  });

  describe('update', () => {
    it('actualiza solo los campos presentes', () => {
      const item = ShoppingItem.create({
        id: 'item-6',
        listId: 'list-1',
        name: 'Queso',
        quantity: 2,
        unit: 'kg',
        createdBy: 'user-1',
        now: NOW,
      });

      const t1 = new Date('2026-05-26T11:00:00Z');
      item.update({ name: 'Queso manchego' }, t1);

      expect(item.name).toBe('Queso manchego');
      expect(item.quantity).toBe(2); // no cambió
      expect(item.unit).toBe('kg');  // no cambió
    });

    it('lanza ItemNameEmptyError si el nombre actualizado está vacío', () => {
      const item = ShoppingItem.create({
        id: 'item-7',
        listId: 'list-1',
        name: 'Aceite',
        createdBy: 'user-1',
        now: NOW,
      });

      expect(() => item.update({ name: '' }, NOW)).toThrow(ItemNameEmptyError);
    });
  });
});

// ── ItemComment ───────────────────────────────────────────────────────────────

describe('ItemComment', () => {
  it('se crea con los datos correctos', () => {
    const comment = ItemComment.create({
      id: 'comment-1',
      itemId: 'item-1',
      authorId: 'user-1',
      body: 'Comprar la marca ecológica.',
      now: NOW,
    });

    expect(comment.body).toBe('Comprar la marca ecológica.');
    expect(comment.authorId).toBe('user-1');
    expect(comment.createdAt).toEqual(NOW);
  });
});
