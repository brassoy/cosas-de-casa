export const RANDOM_BYTES = Symbol('RANDOM_BYTES');

/**
 * Puerto de aleatoriedad criptográfica. Aísla `crypto.randomBytes` para poder
 * inyectar bytes deterministas en los tests del generador de PIN.
 */
export interface RandomBytes {
  bytes(size: number): Uint8Array;
}
