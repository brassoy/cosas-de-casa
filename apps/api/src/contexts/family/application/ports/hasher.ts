export const HASHER = Symbol('HASHER');

/**
 * Puerto de hashing del código de invitación.
 *
 * Diseño: el hash es DETERMINISTA para un mismo código (scrypt con una
 * "pepper" secreta de servidor como sal fija). Esto es lo que permite
 * localizar el PIN por `code_hash` en el consumo atómico. Es seguro porque el
 * código es de un solo uso, de alta entropía (~40 bits), caduca en 24 h y está
 * sujeto a rate limiting; la pepper evita ataques offline aunque se filtre la
 * tabla.
 *
 * El dominio nunca ve el código en claro persistido: solo su hash.
 */
export interface Hasher {
  /** Devuelve el hash determinista (hex) del código. */
  hash(code: string): Promise<string>;

  /** Compara en tiempo constante un código en claro con un hash almacenado. */
  verify(code: string, hash: string): Promise<boolean>;
}
