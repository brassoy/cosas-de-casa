import type {
  FamilyDto,
  FamilySummaryDto,
  MemberDto,
} from '@cosasdecasa/contracts';
import type { MemberView } from '../application/ports/members-read-model';
import type { Family } from '../domain/family';

/**
 * Presenters: traducen los aggregates / vistas de dominio a los DTOs públicos
 * del contrato (`@cosasdecasa/contracts`). Viven en la capa de interfaz porque
 * dan forma a la respuesta HTTP; el dominio no conoce estos shapes.
 */
export const FamilyPresenter = {
  toMemberDto(member: MemberView): MemberDto {
    return {
      userId: member.userId,
      // `displayName` no puede ir vacío en el contrato; si el usuario aún no
      // tiene nombre, mostramos un marcador legible en español.
      displayName: member.displayName?.trim() || 'Sin nombre',
      // `avatarUrl` es opcional en el contrato: omitimos la clave si no hay foto
      // (null → undefined) para no enviar `null` donde el schema espera URL.
      avatarUrl: member.avatarUrl ?? undefined,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    };
  },

  /** Resumen de familia para listados, con el rol del usuario indicado. */
  toSummaryDto(family: Family, viewerUserId: string): FamilySummaryDto {
    const role = family.membershipOf(viewerUserId)?.role ?? 'MEMBER';
    return {
      id: family.id,
      name: family.name,
      description: family.description ?? undefined,
      imageUrl: family.imageUrl ?? undefined,
      role,
      updatedAt: family.updatedAt.toISOString(),
      createdAt: family.createdAt.toISOString(),
    };
  },

  /** Familia completa con miembros. */
  toFamilyDto(family: Family, viewerUserId: string, members: MemberView[]): FamilyDto {
    return {
      ...FamilyPresenter.toSummaryDto(family, viewerUserId),
      members: members.map((m) => FamilyPresenter.toMemberDto(m)),
    };
  },
};
