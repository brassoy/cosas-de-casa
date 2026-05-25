import { Inject, Injectable } from '@nestjs/common';
import { FamilyNotFoundError, NotAnOwnerError } from '../domain/family.errors';
import { JoinPin } from '../domain/join-pin';
import { JoinPinCode } from '../domain/join-pin-code';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../domain/ports/family.repository';
import { CLOCK, type Clock } from './ports/clock';
import { HASHER, type Hasher } from './ports/hasher';
import { ID_GENERATOR, type IdGenerator } from './ports/id-generator';
import { RANDOM_BYTES, type RandomBytes } from './ports/random-bytes';
import { UNIT_OF_WORK, type UnitOfWork } from './ports/unit-of-work';

export interface GenerateJoinPinCommand {
  actingUserId: string;
  familyId: string;
}

export interface GenerateJoinPinResult {
  /** Código en claro, devuelto UNA sola vez. */
  code: string;
  expiresAt: Date;
}

/**
 * Caso de uso: generar un PIN de invitación (solo OWNER).
 *
 * Revoca de forma atómica el PIN ACTIVE previo (si lo hay) y emite uno nuevo,
 * de modo que como mucho exista un PIN activo por familia (también garantizado
 * por el índice único parcial en BD). Devuelve el código en claro una vez; en
 * la BD solo queda su hash.
 */
@Injectable()
export class GenerateJoinPinUseCase {
  // 16 bytes de entropía: de sobra para indexar 8 símbolos del alfabeto.
  private static readonly ENTROPY_BYTES = 16;

  constructor(
    @Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(HASHER) private readonly hasher: Hasher,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(RANDOM_BYTES) private readonly random: RandomBytes,
  ) {}

  async execute(command: GenerateJoinPinCommand): Promise<GenerateJoinPinResult> {
    const family = await this.families.findById(command.familyId);
    if (!family) {
      throw new FamilyNotFoundError();
    }
    if (!family.isOwner(command.actingUserId)) {
      throw new NotAnOwnerError();
    }

    const now = this.clock.now();
    const code = JoinPinCode.fromRandomBytes(this.random.bytes(GenerateJoinPinUseCase.ENTROPY_BYTES));
    const codeHash = await this.hasher.hash(code.value);

    const pin = JoinPin.issue({
      id: this.ids.generate(),
      familyId: family.id,
      codeHash,
      createdBy: command.actingUserId,
      now,
    });

    await this.uow.run(
      async (repos) => {
        // Revoca el activo previo y emite el nuevo en la MISMA transacción para
        // no dejar a la familia sin PIN ni violar el índice único parcial.
        await repos.joinPins.revokeActiveByFamily(family.id, now);
        await repos.joinPins.insert(pin);
      },
      { actingUserId: command.actingUserId },
    );

    return { code: code.value, expiresAt: pin.expiresAt };
  }
}
