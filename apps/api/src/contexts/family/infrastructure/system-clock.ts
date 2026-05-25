import { Injectable } from '@nestjs/common';
import type { Clock } from '../application/ports/clock';

/** Adaptador de {@link Clock} basado en el reloj del sistema. */
@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
