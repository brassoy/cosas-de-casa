import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import {
  APP_USER_REPOSITORY,
  type AppUserRepository,
} from '../domain/ports/app-user.repository';

export interface UpdateDisplayNameCommand {
  /** uid del usuario autenticado (claim `sub` / `app_users.id`). */
  userId: string;
  /** Nuevo nombre visible. Ya viene saneado por el contrato (trim, 1..80). Opcional. */
  displayName?: string;
  /**
   * URL pública del avatar (subido a Storage), o `null` para QUITARLO. `undefined`
   * (ausente) deja el avatar intacto.
   */
  avatarUrl?: string | null;
}

/**
 * Caso de uso: el usuario autenticado actualiza su perfil (nombre visible y/o
 * foto de perfil).
 *
 * A diferencia del aprovisionamiento JIT (que solo fija un default si no había
 * nombre), esto es un cambio explícito y PISA los valores anteriores. Solo
 * actualiza los campos presentes en el comando; `avatarUrl: null` BORRA el avatar.
 */
@Injectable()
export class UpdateDisplayNameUseCase {
  constructor(
    @Inject(APP_USER_REPOSITORY) private readonly appUsers: AppUserRepository,
  ) {}

  async execute(command: UpdateDisplayNameCommand): Promise<AuthenticatedUser> {
    return this.appUsers.updateProfile(command.userId, {
      displayName: command.displayName,
      avatarUrl: command.avatarUrl,
    });
  }
}
