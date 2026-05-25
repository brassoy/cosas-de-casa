import { describe, it, expect } from 'vitest';
import { JoinPinCode, JOIN_PIN_ALPHABET, JOIN_PIN_LENGTH } from './join-pin-code';
import { InvalidJoinPinError } from './family.errors';

// ─── JoinPinCode.fromString ───────────────────────────────────────────────────

describe('JoinPinCode.fromString', () => {
  it('acepta un código válido de 8 caracteres del alfabeto Crockford', () => {
    const code = JoinPinCode.fromString('ABCDEFGH');
    expect(code.value).toBe('ABCDEFGH');
  });

  it('normaliza a mayúsculas', () => {
    const code = JoinPinCode.fromString('abcdefgh');
    expect(code.value).toBe('ABCDEFGH');
  });

  it('normaliza I y L → 1', () => {
    const code = JoinPinCode.fromString('ILAB1234');
    // I→1, L→1 → '11AB1234'
    expect(code.value).toBe('11AB1234');
  });

  it('normaliza O → 0', () => {
    const code = JoinPinCode.fromString('ABCDO234');
    expect(code.value).toBe('ABCD0234');
  });

  it('ignora espacios al inicio/fin (trim)', () => {
    const code = JoinPinCode.fromString('  ABCDEFGH  ');
    expect(code.value).toBe('ABCDEFGH');
  });

  it('lanza InvalidJoinPinError si tiene menos de 8 chars', () => {
    expect(() => JoinPinCode.fromString('ABC')).toThrow(InvalidJoinPinError);
  });

  it('lanza InvalidJoinPinError si tiene más de 8 chars', () => {
    expect(() => JoinPinCode.fromString('ABCDEFGHI')).toThrow(InvalidJoinPinError);
  });

  it('lanza InvalidJoinPinError si contiene U (excluida del alfabeto Crockford)', () => {
    // U no se normaliza, queda U → no pasa la regex
    expect(() => JoinPinCode.fromString('ABCDEFU1')).toThrow(InvalidJoinPinError);
  });

  it('lanza InvalidJoinPinError si está vacío', () => {
    expect(() => JoinPinCode.fromString('')).toThrow(InvalidJoinPinError);
  });

  it('acepta código con dígitos y letras válidas mezcladas', () => {
    const code = JoinPinCode.fromString('0123ABCD');
    expect(code.value).toBe('0123ABCD');
  });
});

// ─── JoinPinCode.fromRandomBytes ─────────────────────────────────────────────

describe('JoinPinCode.fromRandomBytes', () => {
  it('genera un código de exactamente 8 caracteres', () => {
    const bytes = new Uint8Array(16).fill(0);
    const code = JoinPinCode.fromRandomBytes(bytes);
    expect(code.value).toHaveLength(JOIN_PIN_LENGTH);
  });

  it('todos los caracteres pertenecen al alfabeto Crockford', () => {
    const bytes = Uint8Array.from({ length: 16 }, (_, i) => i * 7);
    const code = JoinPinCode.fromRandomBytes(bytes);
    for (const ch of code.value) {
      expect(JOIN_PIN_ALPHABET).toContain(ch);
    }
  });

  it('usa bytes[i] % 32 para indexar el alfabeto (sin sesgo: 256 % 32 = 0)', () => {
    // Byte 0 → índice 0 → '0', byte 1 → índice 1 → '1', …
    const bytes = new Uint8Array(8).fill(0).map((_, i) => i);
    const code = JoinPinCode.fromRandomBytes(bytes);
    let expected = '';
    for (let i = 0; i < 8; i++) {
      expected += JOIN_PIN_ALPHABET[i % JOIN_PIN_ALPHABET.length];
    }
    expect(code.value).toBe(expected);
  });

  it('no incluye I, L, O ni U en el alfabeto', () => {
    expect(JOIN_PIN_ALPHABET).not.toContain('I');
    expect(JOIN_PIN_ALPHABET).not.toContain('L');
    expect(JOIN_PIN_ALPHABET).not.toContain('O');
    expect(JOIN_PIN_ALPHABET).not.toContain('U');
  });

  it('el alfabeto tiene exactamente 32 símbolos (Base32 Crockford)', () => {
    expect(JOIN_PIN_ALPHABET).toHaveLength(32);
  });

  it('lanza Error si se pasan menos de 8 bytes', () => {
    const bytes = new Uint8Array(4);
    expect(() => JoinPinCode.fromRandomBytes(bytes)).toThrow();
  });

  it('bytes=255 (máximo) → índice 255 % 32 = 31 → último char del alfabeto', () => {
    const bytes = new Uint8Array(8).fill(255);
    const code = JoinPinCode.fromRandomBytes(bytes);
    expect(code.value).toBe(JOIN_PIN_ALPHABET[31]!.repeat(8));
  });
});

// ─── toString ────────────────────────────────────────────────────────────────

describe('JoinPinCode.toString', () => {
  it('devuelve el valor del código', () => {
    const code = JoinPinCode.fromString('ABCDEFGH');
    expect(code.toString()).toBe('ABCDEFGH');
  });
});
