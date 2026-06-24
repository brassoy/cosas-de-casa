import { Inject, Injectable } from '@nestjs/common';
import {
  PLAN_PARSING_PORT,
  type PlanParsingPort,
  type ParsedPlan,
} from '../domain/ports/plan-parsing.port';

export interface ParsePlanCommand {
  phrase: string;
  /** Instante de referencia (ISO) para resolver expresiones relativas. */
  now: string;
}

/**
 * Caso de uso: deducir los campos de un plan a partir de lenguaje natural.
 *
 * El puerto lanza {@link AiUnavailableError} si la IA no está disponible; el
 * caso de uso no lo captura (la capa de interfaz lo traduce a 503).
 */
@Injectable()
export class ParsePlanUseCase {
  constructor(
    @Inject(PLAN_PARSING_PORT) private readonly parser: PlanParsingPort,
  ) {}

  async execute(command: ParsePlanCommand): Promise<ParsedPlan> {
    return this.parser.parsePlan(command.phrase, command.now);
  }
}
