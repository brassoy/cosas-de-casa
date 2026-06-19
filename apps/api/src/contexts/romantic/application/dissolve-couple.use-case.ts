import { Inject, Injectable } from '@nestjs/common';
import {
  COUPLE_REPOSITORY,
  type CoupleRepository,
} from '../domain/ports/couple.repository';
import { CoupleNotFoundError, NotCoupleMemberError } from '../domain/romantic.errors';

export interface DissolveCoupleCommand {
  coupleId: string;
  /** Usuario que solicita disolver: debe ser uno de los dos miembros. */
  userId: string;
}

/**
 * Caso de uso "disolver pareja".
 *
 * Solo uno de los dos miembros puede disolverla. Al borrar la pareja, las notas
 * y los retos se eliminan en cascada por la FK (`onDelete: 'cascade'`).
 *
 * El `CoupleScopeGuard` ya valida la pertenencia a nivel HTTP; aquí se repite la
 * comprobación para mantener la regla de negocio dentro del dominio (defensa en
 * profundidad y testabilidad sin Nest).
 */
@Injectable()
export class DissolveCoupleUseCase {
  constructor(
    @Inject(COUPLE_REPOSITORY) private readonly couples: CoupleRepository,
  ) {}

  async execute(cmd: DissolveCoupleCommand): Promise<void> {
    const couple = await this.couples.findById(cmd.coupleId);
    if (!couple) throw new CoupleNotFoundError();
    if (!couple.isMember(cmd.userId)) throw new NotCoupleMemberError();

    await this.couples.delete(cmd.coupleId);
  }
}
