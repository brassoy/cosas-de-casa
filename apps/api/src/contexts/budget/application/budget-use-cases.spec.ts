/**
 * Tests unitarios de los casos de uso del contexto `budget`.
 *
 * Cobertura:
 *  ✓ CreateReceiptUseCase: crea y persiste el ticket con líneas
 *  ✓ CreateReceiptUseCase: total negativo → ReceiptInvalidTotalError
 *  ✓ ListReceiptsUseCase: devuelve los tickets de la familia
 *  ✓ GetReceiptUseCase: devuelve el ticket por id
 *  ✓ GetReceiptUseCase: lanza ReceiptNotFoundError si no existe
 *  ✓ UpdateReceiptUseCase: actualiza merchant y status
 *  ✓ DeleteReceiptUseCase: elimina el ticket
 *  ✓ ExtractReceiptUseCase: delega en el puerto OCR
 *  ✓ ExtractReceiptUseCase: lanza AiUnavailableError si el puerto falla
 *  ✓ GetSpendSummaryUseCase: delega en el repositorio y devuelve el resumen
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { Receipt } from '../domain/receipt';
import {
  ReceiptNotFoundError,
  AiUnavailableError,
  ReceiptInvalidTotalError,
} from '../domain/budget.errors';
import type { ReceiptRepository, SpendSummaryRow } from '../domain/ports/receipt.repository';
import type { ReceiptOcrPort, ExtractReceiptResult } from '../domain/ports/receipt-ocr.port';
import type { BudgetClock } from './ports/clock';
import type { BudgetIdGenerator } from './ports/id-generator';

import { CreateReceiptUseCase } from './create-receipt.use-case';
import { ListReceiptsUseCase } from './list-receipts.use-case';
import { GetReceiptUseCase } from './get-receipt.use-case';
import { UpdateReceiptUseCase } from './update-receipt.use-case';
import { DeleteReceiptUseCase } from './delete-receipt.use-case';
import { ExtractReceiptUseCase } from './extract-receipt.use-case';
import { GetSpendSummaryUseCase } from './get-spend-summary.use-case';

// ── Fakes ──────────────────────────────────────────────────────────────────

let store: Receipt[] = [];
let idCounter = 0;
const FIXED_NOW = new Date('2026-05-26T10:00:00Z');

const fakeClock: BudgetClock = { now: () => FIXED_NOW };
const fakeIds: BudgetIdGenerator = { generate: () => `id-${++idCounter}` };

const fakeRepo: ReceiptRepository = {
  async create(r) { store.push(r); },
  async findById(id) { return store.find((r) => r.id === id) ?? null; },
  async findByFamily(familyId) { return store.filter((r) => r.familyId === familyId); },
  async update(r) {
    const idx = store.findIndex((s) => s.id === r.id);
    if (idx !== -1) store[idx] = r;
  },
  async deleteById(id) { store = store.filter((r) => r.id !== id); },
  async getSpendSummary(familyId, from, to): Promise<SpendSummaryRow> {
    return {
      total: '100.00',
      currency: 'EUR',
      byCategory: [{ category: 'groceries', total: '80.00' }],
      byMonth: [{ month: '2026-05', total: '100.00' }],
    };
  },
};

function makeUseCases() {
  return {
    create: new CreateReceiptUseCase(fakeRepo, fakeClock, fakeIds),
    list: new ListReceiptsUseCase(fakeRepo),
    get: new GetReceiptUseCase(fakeRepo),
    update: new UpdateReceiptUseCase(fakeRepo, fakeClock, fakeIds),
    remove: new DeleteReceiptUseCase(fakeRepo),
    getSpendSummary: new GetSpendSummaryUseCase(fakeRepo),
  };
}

beforeEach(() => {
  store = [];
  idCounter = 0;
});

// ── CreateReceiptUseCase ───────────────────────────────────────────────────────

describe('CreateReceiptUseCase', () => {
  it('crea y persiste el ticket con líneas', async () => {
    const { create } = makeUseCases();
    const receipt = await create.execute({
      familyId: 'fam-1',
      actingUserId: 'user-1',
      merchant: 'Mercadona',
      purchasedAt: '2026-05-26',
      total: '15.50',
      currency: 'EUR',
      lines: [
        { description: 'Leche', lineTotal: '1.50', category: 'groceries' },
        { description: 'Jabón', lineTotal: '2.00', category: 'household' },
      ],
    });
    expect(receipt.merchant).toBe('Mercadona');
    expect(receipt.total).toBe('15.50');
    expect(receipt.lines).toHaveLength(2);
    expect(store).toHaveLength(1);
  });

  it('total negativo → ReceiptInvalidTotalError', async () => {
    const { create } = makeUseCases();
    await expect(
      create.execute({
        familyId: 'fam-1',
        actingUserId: 'user-1',
        purchasedAt: '2026-05-26',
        total: '-5',
      }),
    ).rejects.toThrow(ReceiptInvalidTotalError);
  });
});

// ── ListReceiptsUseCase ────────────────────────────────────────────────────────

describe('ListReceiptsUseCase', () => {
  it('devuelve los tickets de la familia', async () => {
    const { create, list } = makeUseCases();
    await create.execute({ familyId: 'fam-1', actingUserId: 'user-1', purchasedAt: '2026-05-26', total: '10' });
    await create.execute({ familyId: 'fam-1', actingUserId: 'user-1', purchasedAt: '2026-05-25', total: '20' });
    await create.execute({ familyId: 'fam-2', actingUserId: 'user-2', purchasedAt: '2026-05-24', total: '5' });

    const result = await list.execute({ familyId: 'fam-1' });
    expect(result).toHaveLength(2);
  });
});

// ── GetReceiptUseCase ─────────────────────────────────────────────────────────

describe('GetReceiptUseCase', () => {
  it('devuelve el ticket por id', async () => {
    const { create, get } = makeUseCases();
    const receipt = await create.execute({ familyId: 'fam-1', actingUserId: 'user-1', purchasedAt: '2026-05-26', total: '10' });
    const found = await get.execute({ receiptId: receipt.id });
    expect(found.id).toBe(receipt.id);
  });

  it('lanza ReceiptNotFoundError si no existe', async () => {
    const { get } = makeUseCases();
    await expect(get.execute({ receiptId: 'ghost' })).rejects.toThrow(ReceiptNotFoundError);
  });
});

// ── UpdateReceiptUseCase ──────────────────────────────────────────────────────

describe('UpdateReceiptUseCase', () => {
  it('actualiza merchant y status', async () => {
    const { create, update } = makeUseCases();
    const receipt = await create.execute({ familyId: 'fam-1', actingUserId: 'user-1', purchasedAt: '2026-05-26', total: '10' });
    const updated = await update.execute({
      receiptId: receipt.id,
      merchant: 'Carrefour',
      status: 'confirmed',
    });
    expect(updated.merchant).toBe('Carrefour');
    expect(updated.status).toBe('confirmed');
  });
});

// ── DeleteReceiptUseCase ──────────────────────────────────────────────────────

describe('DeleteReceiptUseCase', () => {
  it('elimina el ticket', async () => {
    const { create, remove } = makeUseCases();
    const receipt = await create.execute({ familyId: 'fam-1', actingUserId: 'user-1', purchasedAt: '2026-05-26', total: '10' });
    await remove.execute({ receiptId: receipt.id });
    expect(store.find((r) => r.id === receipt.id)).toBeUndefined();
  });
});

// ── ExtractReceiptUseCase ─────────────────────────────────────────────────────

describe('ExtractReceiptUseCase', () => {
  it('delega en el puerto OCR y devuelve el resultado', async () => {
    const ocrResult: ExtractReceiptResult = {
      merchant: 'Mercadona',
      purchasedAt: '2026-05-26',
      total: 15.5,
      currency: 'EUR',
      lines: [{ description: 'Leche', lineTotal: 1.5, category: 'groceries' }],
    };
    const mockOcr: ReceiptOcrPort = {
      extract: async () => ocrResult,
    };
    const uc = new ExtractReceiptUseCase(mockOcr);
    const result = await uc.execute({ imageBase64: 'base64data' });
    expect(result.merchant).toBe('Mercadona');
    expect(result.lines).toHaveLength(1);
  });

  it('lanza AiUnavailableError si el puerto falla', async () => {
    const mockOcr: ReceiptOcrPort = {
      extract: async () => { throw new AiUnavailableError('Sin balance'); },
    };
    const uc = new ExtractReceiptUseCase(mockOcr);
    await expect(uc.execute({ imageBase64: 'base64data' })).rejects.toThrow(AiUnavailableError);
  });
});

// ── GetSpendSummaryUseCase ────────────────────────────────────────────────────

describe('GetSpendSummaryUseCase', () => {
  it('devuelve el resumen del repositorio con totales por categoría y mes', async () => {
    const { getSpendSummary } = makeUseCases();
    const summary = await getSpendSummary.execute({
      familyId: 'fam-1',
      from: '2026-05-01',
      to: '2026-05-31',
    });
    expect(summary.total).toBe('100.00');
    expect(summary.byCategory).toHaveLength(1);
    expect(summary.byCategory[0].category).toBe('groceries');
    expect(summary.byMonth).toHaveLength(1);
  });
});
