import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { RandomBytes } from '../application/ports/random-bytes';

/** Adaptador de {@link RandomBytes} con `crypto.randomBytes` (CSPRNG). */
@Injectable()
export class CryptoRandomBytes implements RandomBytes {
  bytes(size: number): Uint8Array {
    return new Uint8Array(randomBytes(size));
  }
}
