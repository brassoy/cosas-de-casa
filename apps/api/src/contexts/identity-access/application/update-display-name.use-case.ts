import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../domain/authenticated-user';
import {
  APP_USER_REPOSITORY,
  type AppUserRepository,
} from '../domain/ports/app-user.repository';

export interface UpdateDisplayNameCommand {
  /** uid del usuario autenticado (claim `sub` / `app_users.id`). */
  userId: string;
  /** Nuevo nombre visible. Ya viene saneado por el contrato (trim, 1..80). */
  displayName: string;
}

/**
 * Caso de uso: el usuario autenticado cambia su nombre visible (`display_name`).
 *
 * A diferencia del aprovisionamiento JIT (que solo fija un default si no había
 * nombre), esto es un cambio explícito y PISA el valor anterior.
 */
@Injectable()
export class UpdateDisplayNameUseCase {
  constructor(
    @Inject(APP_USER_REPOSITORY) private readonly appUsers: AppUserRepository,
  ) {}

  async execute(command: UpdateDisplayNameCommand): Promise<AuthenticatedUser> {
    return this.appUsers.updateDisplayName(command.userId, command.displayName);
  }
}
