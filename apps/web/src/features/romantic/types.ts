/**
 * Tipos del rincón de pareja.
 *
 * Los DTOs de dominio se importan directamente de @cosasdecasa/contracts.
 * Este archivo conserva únicamente los helpers de UI que no pertenecen al contrato.
 */

// Re-exportamos los contratos para uso interno de la feature
export type {
  CoupleDto,
  CoupleNoteDto,
  CoupleChallengeDto,
  CoupleChallengeStatus,
  CreateCoupleInput,
  CreateCoupleNoteInput,
  MarkChallengeDoneInput,
} from '@cosasdecasa/contracts';

// ── Helpers de UI ─────────────────────────────────────────────────────────────

/**
 * Pestaña activa del rincón de pareja.
 * No pertenece al contrato de API; es estado de UI puro.
 */
export type RomanticTab = 'challenges' | 'notes';
