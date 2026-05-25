import { InvalidJoinPinError } from './family.errors';

/**
 * Value object: código de invitación de un solo uso.
 *
 * Formato: 8 caracteres del alfabeto Crockford Base32 (dígitos + letras
 * mayúsculas excluyendo I, L, O, U para evitar ambigüedad visual). 32 símbolos
 * elevado a 8 ≈ 40 bits de entropía: inviable de adivinar por fuerza bruta
 * dentro de la ventana de validez (24 h) y con rate limiting.
 *
 * El dominio NUNCA persiste el código en claro; solo se entrega una vez y
 * después se guarda únicamente su hash (puerto Hasher).
 */
export const JOIN_PIN_LENGTH = 8;
export const JOIN_PIN_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const PIN_REGEX = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/;

export class JoinPinCode {
  private constructor(public readonly value: string) {}

  /**
   * Normaliza (mayúsculas, sin espacios) y valida un código introducido por el
   * usuario. Mapea I/L→1 y O→0 (errores de transcripción típicos). Lanza
   * {@link InvalidJoinPinError} si tras normalizar no encaja.
   */
  static fromString(raw: string): JoinPinCode {
    const normalized = raw
      .trim()
      .toUpperCase()
      .replace(/[IL]/g, '1')
      .replace(/O/g, '0');
    if (!PIN_REGEX.test(normalized)) {
      throw new InvalidJoinPinError();
    }
    return new JoinPinCode(normalized);
  }

  /**
   * Construye un código a partir de bytes aleatorios (función pura: la fuente
   * de aleatoriedad es un puerto de infraestructura). Necesita al menos
   * {@link JOIN_PIN_LENGTH} bytes; usa el byte módulo 32 para indexar el
   * alfabeto. El sesgo de 256 % 32 = 0 es nulo (256 es múltiplo de 32).
   */
  static fromRandomBytes(bytes: Uint8Array): JoinPinCode {
    if (bytes.length < JOIN_PIN_LENGTH) {
      throw new Error(`Se necesitan al menos ${JOIN_PIN_LENGTH} bytes para generar el código.`);
    }
    let out = '';
    for (let i = 0; i < JOIN_PIN_LENGTH; i++) {
      // bytes[i] está garantizado por el guard de longitud anterior.
      out += JOIN_PIN_ALPHABET[bytes[i]! % JOIN_PIN_ALPHABET.length];
    }
    return new JoinPinCode(out);
  }

  toString(): string {
    return this.value;
  }
}
