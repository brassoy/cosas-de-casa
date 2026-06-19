import { Injectable } from '@nestjs/common';
import {
  CHALLENGE_CATALOG,
  type ChallengeDefinition,
} from '../domain/challenge-catalog';

/**
 * Caso de uso "listar el catálogo de retos disponibles".
 *
 * El catálogo es una constante en código (no tabla). Este caso de uso lo expone
 * para que el frontend pueda mostrar qué retos se pueden añadir a la pareja.
 * No depende de ningún repositorio ni de la pareja: es información estática.
 */
@Injectable()
export class ListChallengeCatalogUseCase {
  execute(): ChallengeDefinition[] {
    return CHALLENGE_CATALOG;
  }
}
