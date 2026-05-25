import { describe, expect, it } from 'vitest';
import {
  AddItemDecisionSchema,
  AuthMeDtoSchema,
  CreateFamilyInputSchema,
  FamilyDtoSchema,
  GeneratePinResponseSchema,
  JoinFamilyInputSchema,
  JoinPinCodeSchema,
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

describe('JoinPinCodeSchema', () => {
  it('acepta un código válido de 8 caracteres Crockford', () => {
    expect(JoinPinCodeSchema.parse('A1B2C3D4')).toBe('A1B2C3D4');
  });

  it('normaliza minúsculas y espacios a mayúsculas', () => {
    expect(JoinPinCodeSchema.parse('  a1b2c3d4 ')).toBe('A1B2C3D4');
  });

  it('rechaza longitud incorrecta', () => {
    expect(() => JoinPinCodeSchema.parse('A1B2')).toThrow();
  });

  it('rechaza letras ambiguas excluidas (I, L, O, U)', () => {
    expect(() => JoinPinCodeSchema.parse('ILOU1234')).toThrow();
  });
});

describe('JoinFamilyInputSchema', () => {
  it('acepta y normaliza un código en el campo code', () => {
    expect(JoinFamilyInputSchema.parse({ code: 'a1b2c3d4' })).toEqual({ code: 'A1B2C3D4' });
  });
});

describe('CreateFamilyInputSchema', () => {
  it('acepta solo nombre y recorta espacios', () => {
    expect(CreateFamilyInputSchema.parse({ name: '  Los García  ' })).toEqual({ name: 'Los García' });
  });

  it('rechaza nombre vacío', () => {
    expect(() => CreateFamilyInputSchema.parse({ name: '' })).toThrow();
  });
});

describe('GeneratePinResponseSchema', () => {
  it('parsea código y caducidad', () => {
    const r = GeneratePinResponseSchema.parse({ code: 'A1B2C3D4', expiresAt: SAMPLE_DATE });
    expect(r.code).toBe('A1B2C3D4');
    expect(r.expiresAt).toBe(SAMPLE_DATE);
  });
});

describe('AuthMeDtoSchema', () => {
  it('parsea un usuario sin familias', () => {
    const me = AuthMeDtoSchema.parse({
      id: SAMPLE_UUID,
      email: 'ana@example.com',
      displayName: 'Ana',
      families: [],
    });
    expect(me.families).toEqual([]);
  });

  it('acepta displayName nulo', () => {
    expect(() =>
      AuthMeDtoSchema.parse({ id: SAMPLE_UUID, email: 'ana@example.com', displayName: null, families: [] }),
    ).not.toThrow();
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
      role: 'OWNER',
      members: [],
      updatedAt: SAMPLE_DATE,
      createdAt: SAMPLE_DATE,
    };
    const result = FamilyDtoSchema.parse(family);
    expect(result.name).toBe('Los García');
    expect(result.role).toBe('OWNER');
  });
});
