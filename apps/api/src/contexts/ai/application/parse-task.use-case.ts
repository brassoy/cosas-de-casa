import { Inject, Injectable } from '@nestjs/common';
import {
  TASK_PARSING_PORT,
  type TaskParsingPort,
  type ParsedTask,
} from '../domain/ports/task-parsing.port';

export interface ParseTaskCommand {
  phrase: string;
  /** Instante de referencia (ISO) para resolver expresiones relativas. */
  now: string;
}

/**
 * Caso de uso: deducir los campos de una tarea a partir de lenguaje natural.
 *
 * El puerto lanza {@link AiUnavailableError} si la IA no está disponible; el
 * caso de uso no lo captura (la capa de interfaz lo traduce a 503).
 */
@Injectable()
export class ParseTaskUseCase {
  constructor(
    @Inject(TASK_PARSING_PORT) private readonly parser: TaskParsingPort,
  ) {}

  async execute(command: ParseTaskCommand): Promise<ParsedTask> {
    return this.parser.parseTask(command.phrase, command.now);
  }
}
