import { Inject, Injectable } from '@nestjs/common';
import {
  PERSONAL_DATA_EXPORT_REPOSITORY,
  type PersonalDataExport,
  type PersonalDataExportRepository,
} from '../domain/ports/personal-data-export.repository';

export interface ExportPersonalDataCommand {
  /** uid del usuario autenticado (claim `sub` / `app_users.id`). */
  userId: string;
}

/**
 * Caso de uso: el usuario autenticado DESCARGA todos sus datos personales
 * (derecho de acceso y portabilidad — GDPR art. 15 y 20). Devuelve una estructura
 * serializable a JSON; la composición del archivo de descarga la hace la web.
 */
@Injectable()
export class ExportPersonalDataUseCase {
  constructor(
    @Inject(PERSONAL_DATA_EXPORT_REPOSITORY)
    private readonly repo: PersonalDataExportRepository,
  ) {}

  async execute(command: ExportPersonalDataCommand): Promise<PersonalDataExport> {
    return this.repo.exportFor(command.userId);
  }
}
