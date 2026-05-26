import type {
  GroupDto,
  GroupMemberDto,
  GroupSummaryDto,
} from '@cosasdecasa/contracts';
import type { GroupMemberView } from '../application/ports/group-members-read-model';
import type { Group } from '../domain/group';

/**
 * Presenters: traducen los aggregates / vistas de dominio a los DTOs públicos
 * del contrato (`@cosasdecasa/contracts`).
 */
export const GroupPresenter = {
  toMemberDto(member: GroupMemberView): GroupMemberDto {
    return {
      userId: member.userId,
      displayName: member.displayName?.trim() || 'Sin nombre',
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    };
  },

  toSummaryDto(group: Group, viewerUserId: string): GroupSummaryDto {
    const role = group.membershipOf(viewerUserId)?.role ?? 'MEMBER';
    return {
      id: group.id,
      name: group.name,
      description: group.description ?? undefined,
      imageUrl: group.imageUrl ?? undefined,
      role,
      updatedAt: group.updatedAt.toISOString(),
      createdAt: group.createdAt.toISOString(),
    };
  },

  toGroupDto(group: Group, viewerUserId: string, members: GroupMemberView[]): GroupDto {
    return {
      ...GroupPresenter.toSummaryDto(group, viewerUserId),
      members: members.map((m) => GroupPresenter.toMemberDto(m)),
    };
  },
};
