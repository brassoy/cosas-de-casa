import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { IdGenerator } from '../application/ports/id-generator';

/** Adaptador de {@link IdGenerator} con UUID v4 de node:crypto. */
@Injectable()
export class UuidIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
