import { describe, expect, it } from 'vitest';
import {
  AddItemDecisionSchema,
  FamilyDtoSchema,
  JoinPinDtoSchema,
  MembershipRoleSchema,
  ShoppingItemDtoSchema,
  ShoppingListDtoSchema,
  UuidSchema,
} from './index';

const SAMPLE_UUID = '550e8400-e29b-41d4-a716-446655440000';
const SAMPLE_DATE = '2026-05-25T10:00:00.000Z';

describe('UuidSchema', () => {
  it('acepta un UUID válido', () => {
    expect(UuidSchema.parse(SAMPLE_UUID)).toBe(SAMPLE_UUID);
  });

  it('rechaza una cadena que no es UUID', () => {
    expect(() => UuidSchema.parse('no-es-uuid')).toThrow();
  });
});

describe('MembershipRoleSchema', () => {
  it('acepta OWNER y MEMBER', () => {
    expect(MembershipRoleSchema.parse('OWNER')).toBe('OWNER');
    expect(MembershipRoleSchema.parse('MEMBER')).toBe('MEMBER');
  });

  it('rechaza un rol desconocido', () => {
    expect(() => MembershipRoleSchema.parse('ADMIN')).toThrow();
  });
});

describe('AddItemDecisionSchema', () => {
  it('acepta los tres valores válidos', () => {
    expect(AddItemDecisionSchema.parse('ADD_NEW')).toBe('ADD_NEW');
    expect(AddItemDecisionSchema.parse('AUTO_MERGE')).toBe('AUTO_MERGE');
    expect(AddItemDecisionSchema.parse('SUGGEST')).toBe('SUGGEST');
  });
});

describe('JoinPinDtoSchema', () => {
  it('acepta un PIN válido de 6 caracteres en mayúsculas', () => {
    const result = JoinPinDtoSchema.parse({ pin: 'ABC123' });
    expect(result.pin).toBe('ABC123');
  });

  it('rechaza un PIN con minúsculas', () => {
    expect(() => JoinPinDtoSchema.parse({ pin: 'abc123' })).toThrow();
  });

  it('rechaza un PIN con longitud incorrecta', () => {
    expect(() => JoinPinDtoSchema.parse({ pin: 'AB12' })).toThrow();
  });
});

describe('ShoppingItemDtoSchema', () => {
  const validItem = {
    id: SAMPLE_UUID,
    name: 'Leche entera',
    quantity: 2,
    unit: 'L',
    checked: false,
    updatedAt: SAMPLE_DATE,
    createdAt: SAMPLE_DATE,
  };

  it('parsea un artículo válido', () => {
    const result = ShoppingItemDtoSchema.parse(validItem);
    expect(result.name).toBe('Leche entera');
    expect(result.checked).toBe(false);
  });

  it('acepta artículo sin campos opcionales', () => {
    const minimal = {
      id: SAMPLE_UUID,
      name: 'Pan',
      checked: true,
      updatedAt: SAMPLE_DATE,
      createdAt: SAMPLE_DATE,
    };
    expect(() => ShoppingItemDtoSchema.parse(minimal)).not.toThrow();
  });

  it('rechaza un artículo sin nombre', () => {
    expect(() => ShoppingItemDtoSchema.parse({ ...validItem, name: '' })).toThrow();
  });
});

describe('ShoppingListDtoSchema', () => {
  it('parsea una lista válida con items', () => {
    const list = {
      id: SAMPLE_UUID,
      familyId: SAMPLE_UUID,
      name: 'Compra semanal',
      items: [],
      addItemDecision: 'SUGGEST',
      updatedAt: SAMPLE_DATE,
      createdAt: SAMPLE_DATE,
    };
    const result = ShoppingListDtoSchema.parse(list);
    expect(result.addItemDecision).toBe('SUGGEST');
  });
});

describe('FamilyDtoSchema', () => {
  it('parsea una familia sin miembros', () => {
    const family = {
      id: SAMPLE_UUID,
      name: 'Los García',
      members: [],
      updatedAt: SAMPLE_DATE,
      createdAt: SAMPLE_DATE,
    };
    const result = FamilyDtoSchema.parse(family);
    expect(result.name).toBe('Los García');
  });
});
