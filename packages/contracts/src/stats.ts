import { z } from 'zod';
import { UuidSchema } from './common';

// ── Logros (badges) ───────────────────────────────────────────────────────────

export const BadgeDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  earnedAt: z.string().datetime().nullable(),
});
export type BadgeDto = z.infer<typeof BadgeDtoSchema>;

// ── Estadísticas por miembro ─────────────────────────────────────────────────

export const MemberStatsDtoSchema = z.object({
  userId: UuidSchema,
  displayName: z.string().nullable(),
  email: z.string().email(),
  shoppingItemsAdded: z.number().int().nonnegative(),
  tasksCompleted: z.number().int().nonnegative(),
  fridgeItemsAdded: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
  /** Días consecutivos de actividad (lectura simple). */
  currentStreak: z.number().int().nonnegative(),
  badges: z.array(BadgeDtoSchema),
});
export type MemberStatsDto = z.infer<typeof MemberStatsDtoSchema>;

// ── Dashboard de familia ──────────────────────────────────────────────────────

export const StatsDtoSchema = z.object({
  familyId: UuidSchema,
  totalShoppingItemsAdded: z.number().int().nonnegative(),
  totalTasksCompleted: z.number().int().nonnegative(),
  totalFridgeItemsAdded: z.number().int().nonnegative(),
  members: z.array(MemberStatsDtoSchema),
});
export type StatsDto = z.infer<typeof StatsDtoSchema>;

// ── Entrada del ranking ───────────────────────────────────────────────────────

export const LeaderboardEntryDtoSchema = z.object({
  rank: z.number().int().positive(),
  userId: UuidSchema,
  displayName: z.string().nullable(),
  email: z.string().email(),
  points: z.number().int().nonnegative(),
  badges: z.array(BadgeDtoSchema),
});
export type LeaderboardEntryDto = z.infer<typeof LeaderboardEntryDtoSchema>;
