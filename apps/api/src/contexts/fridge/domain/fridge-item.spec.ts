/**
 * Tests unitarios del agregado FridgeItem.
 *
 * Cobertura:
 *  ✓ create: nombre vacío → FridgeItemNameEmptyError
 *  ✓ create: location por defecto es FRIDGE
 *  ✓ eat: sin cantidad → eliminar (true)
 *  ✓ eat: sin amount → eliminar (true)
 *  ✓ eat: decrementa cantidad correctamente
 *  ✓ eat: cantidad resultante 0 → eliminar (true)
 *  ✓ eat: amount > quantity → FridgeItemInsufficientQuantityError
 *  ✓ eat: amount inválido → FridgeItemInvalidQuantityError
 *  ✓ freeze: cambia location a FREEZER
 *  ✓ update: cambia nombre y location
 */
import { describe, expect, it } from 'vitest';
import { FridgeItem } from './fridge-item';
import {
  FridgeItemNameEmptyError,
  FridgeItemInsufficientQuantityError,
  FridgeItemInvalidQuantityError,
} from './fridge.errors';

const NOW = new Date('2026-05-26T10:00:00Z');

function makeItem(overrides: Partial<Parameters<typeof FridgeItem.create>[0]> = {}) {
  return FridgeItem.create({
    id: 'item-1',
    familyId: 'fam-1',
    name: 'Leche',
    quantity: '2',
    unit: 'L',
    createdBy: 'user-1',
    now: NOW,
    ...overrides,
  });
}

describe('FridgeItem.create', () => {
  it('lanza FridgeItemNameEmptyError si el nombre está vacío', () => {
    expect(() => makeItem({ name: '   ' })).toThrow(FridgeItemNameEmptyError);
  });

  it('asigna location FRIDGE por defecto', () => {
    const item = makeItem({ location: undefined });
    expect(item.location).toBe('FRIDGE');
  });

  it('recorta espacios del nombre', () => {
    const item = makeItem({ name: '  Yogur  ' });
    expect(item.name).toBe('Yogur');
  });
});

describe('FridgeItem.eat', () => {
  it('sin cantidad → devuelve true (eliminar)', () => {
    const item = makeItem({ quantity: undefined });
    expect(item.eat(undefined, NOW)).toBe(true);
  });

  it('sin amount → devuelve true (eliminar)', () => {
    const item = makeItem({ quantity: '1' });
    expect(item.eat(undefined, NOW)).toBe(true);
  });

  it('decrementa la cantidad correctamente', () => {
    const item = makeItem({ quantity: '3' });
    const shouldDelete = item.eat('1', NOW);
    expect(shouldDelete).toBe(false);
    expect(item.quantity).toBe('2');
  });

  it('cantidad resultante 0 → devuelve true (eliminar)', () => {
    const item = makeItem({ quantity: '1' });
    expect(item.eat('1', NOW)).toBe(true);
  });

  it('lanza FridgeItemInsufficientQuantityError si amount > quantity', () => {
    const item = makeItem({ quantity: '1' });
    expect(() => item.eat('5', NOW)).toThrow(FridgeItemInsufficientQuantityError);
  });

  it('lanza FridgeItemInvalidQuantityError si amount es 0 o negativo', () => {
    const item = makeItem({ quantity: '5' });
    expect(() => item.eat('0', NOW)).toThrow(FridgeItemInvalidQuantityError);
  });
});

describe('FridgeItem.freeze', () => {
  it('cambia la location a FREEZER', () => {
    const item = makeItem({ location: 'FRIDGE' });
    item.freeze(NOW);
    expect(item.location).toBe('FREEZER');
  });
});

describe('FridgeItem.update', () => {
  it('actualiza el nombre y la location', () => {
    const item = makeItem();
    item.update({ name: 'Leche desnatada', location: 'PANTRY' }, NOW);
    expect(item.name).toBe('Leche desnatada');
    expect(item.location).toBe('PANTRY');
  });

  it('lanza FridgeItemNameEmptyError si el nuevo nombre está vacío', () => {
    const item = makeItem();
    expect(() => item.update({ name: '' }, NOW)).toThrow(FridgeItemNameEmptyError);
  });
});
