import { createZodDto } from 'nestjs-zod';
import { RoutineStatsQuerySchema } from '@cosasdecasa/contracts';

export class RoutineStatsQueryDto extends createZodDto(RoutineStatsQuerySchema.strict()) {}
