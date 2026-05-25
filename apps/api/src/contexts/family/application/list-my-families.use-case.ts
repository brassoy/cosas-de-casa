import { Inject, Injectable } from '@nestjs/common';
import type { Family } from '../domain/family';
import { FAMILY_REPOSITORY, type FamilyRepository } from '../domain/ports/family.repository';

export interface ListMyFamiliesQuery {
  actingUserId: string;
}

/**
 * Caso de uso: listar las familias a las que pertenece el usuario autenticado.
 * Se usa en `GET /families` y como parte de `GET /auth/me`.
 */
@Injectable()
export class ListMyFamiliesUseCase {
  constructor(@Inject(FAMILY_REPOSITORY) private readonly families: FamilyRepository) {}

  execute(query: ListMyFamiliesQuery): Promise<Family[]> {
    return this.families.findByMember(query.actingUserId);
  }
}
