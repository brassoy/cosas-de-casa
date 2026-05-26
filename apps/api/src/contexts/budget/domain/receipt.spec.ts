/**
 * Tests unitarios de las entidades de dominio del contexto `budget`.
 *
 * Cobertura:
 *  ✓ Receipt.create: crea un ticket válido
 *  ✓ Receipt.create: total negativo → ReceiptInvalidTotalError
 *  ✓ ReceiptLine.create: lineTotal negativo → ReceiptLineTotalNegativeError
 *  ✓ Receipt.update: actualiza merchant y status
 *  ✓ Receipt.replaceLines: reemplaza las líneas
 */
import { describe, expect, it } from 'vitest';
import { Receipt, ReceiptLine } from './receipt';
import { ReceiptInvalidTotalError, ReceiptLineTotalNegativeError } from './budget.errors';

const NOW = new Date('2026-05-26T10:00:00Z');

function makeReceipt() {
  return Receipt.create({
    id: 'r-1',
    familyId: 'fam-1',
    merchant: 'Mercadona',
    purchasedAt: '2026-05-26',
    total: '15.50',
    currency: 'EUR',
    createdBy: 'user-1',
    now: NOW,
  });
}

describe('Receipt.create', () => {
  it('crea un ticket válido con merchant y sin líneas', () => {
    const r = makeReceipt();
    expect(r.merchant).toBe('Mercadona');
    expect(r.total).toBe('15.50');
    expect(r.status).toBe('confirmed');
    expect(r.lines).toHaveLength(0);
  });

  it('crea un ticket con líneas', () => {
    const r = Receipt.create({
      id: 'r-2',
      familyId: 'fam-1',
      purchasedAt: '2026-05-26',
      total: '10',
      createdBy: 'user-1',
      now: NOW,
      lines: [
        { id: 'l-1', receiptId: 'r-2', description: 'Leche', lineTotal: '1.50', category: 'groceries', now: NOW },
        { id: 'l-2', receiptId: 'r-2', description: 'Jabón', lineTotal: '2.00', now: NOW },
      ],
    });
    expect(r.lines).toHaveLength(2);
    expect(r.lines[1].category).toBe('other');
  });

  it('total negativo → ReceiptInvalidTotalError', () => {
    expect(() =>
      Receipt.create({
        id: 'r-3',
        familyId: 'fam-1',
        purchasedAt: '2026-05-26',
        total: '-1',
        createdBy: 'user-1',
        now: NOW,
      }),
    ).toThrow(ReceiptInvalidTotalError);
  });
});

describe('ReceiptLine.create', () => {
  it('lineTotal negativo → ReceiptLineTotalNegativeError', () => {
    expect(() =>
      ReceiptLine.create({
        id: 'l-1',
        receiptId: 'r-1',
        description: 'Algo',
        lineTotal: '-0.01',
        now: NOW,
      }),
    ).toThrow(ReceiptLineTotalNegativeError);
  });
});

describe('Receipt.update', () => {
  it('actualiza merchant y status', () => {
    const r = makeReceipt();
    r.update({ merchant: 'Carrefour', status: 'confirmed' }, NOW);
    expect(r.merchant).toBe('Carrefour');
    expect(r.status).toBe('confirmed');
  });

  it('total negativo en update → ReceiptInvalidTotalError', () => {
    const r = makeReceipt();
    expect(() => r.update({ total: '-5' }, NOW)).toThrow(ReceiptInvalidTotalError);
  });
});

describe('Receipt.replaceLines', () => {
  it('reemplaza las líneas existentes', () => {
    const r = makeReceipt();
    const newLines = [
      ReceiptLine.create({ id: 'l-new', receiptId: 'r-1', description: 'Nueva', lineTotal: '5', now: NOW }),
    ];
    r.replaceLines(newLines, NOW);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].description).toBe('Nueva');
  });
});
