import { scrypt, timingSafeEqual, type BinaryLike, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env.config';
import type { Hasher } from '../application/ports/hasher';

// El tipo promisificado de `scrypt` en @types/node no expone el 4º argumento de
// opciones; lo tipamos explícitamente para poder pasar el coste (N).
const scryptAsync = promisify(scrypt) as (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

export const HASHER_PEPPER = Symbol('HASHER_PEPPER');

/**
 * Adaptador de {@link Hasher} con scrypt (node:crypto).
 *
 * El hash es DETERMINISTA: usa una "pepper" secreta de servidor como sal fija,
 * lo que permite localizar el PIN por `code_hash` en el consumo atómico. La
 * comparación de verificación usa `timingSafeEqual` para no filtrar info por
 * tiempo. Parámetros de coste moderados: el código es de un solo uso, efímero
 * (24 h) y con rate limiting, así que no necesitamos el coste de una contraseña
 * de usuario; aun así la pepper bloquea ataques offline si se filtra la tabla.
 */
@Injectable()
export class ScryptHasher implements Hasher {
  private static readonly KEYLEN = 32;
  private static readonly COST = 16384; // N=2^14
  private readonly pepper: Buffer;

  constructor(@Inject(HASHER_PEPPER) pepper: string) {
    this.pepper = Buffer.from(pepper, 'utf8');
  }

  /** Factory para DI: deriva la pepper desde la configuración validada. */
  static fromConfig(config: ConfigService<Env, true>): ScryptHasher {
    const pepper = config.get('JOIN_PIN_PEPPER', { infer: true });
    if (!pepper) {
      throw new Error('JOIN_PIN_PEPPER es obligatoria para hashear los PIN de invitación.');
    }
    return new ScryptHasher(pepper);
  }

  async hash(code: string): Promise<string> {
    const derived = (await scryptAsync(code, this.pepper, ScryptHasher.KEYLEN, {
      N: ScryptHasher.COST,
    })) as Buffer;
    return derived.toString('hex');
  }

  async verify(code: string, hash: string): Promise<boolean> {
    const expected = Buffer.from(hash, 'hex');
    const actual = (await scryptAsync(code, this.pepper, ScryptHasher.KEYLEN, {
      N: ScryptHasher.COST,
    })) as Buffer;
    if (expected.length !== actual.length) {
      return false;
    }
    return timingSafeEqual(expected, actual);
  }
}
