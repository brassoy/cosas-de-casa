import type { FridgeItemDto } from '@cosasdecasa/contracts';
import type { FridgeItem } from '../domain/fridge-item';

/** Traduce entidades de dominio a DTOs del contrato público. */
export const FridgePresenter = {
  toItemDto(item: FridgeItem): FridgeItemDto {
    return {
      id: item.id,
      familyId: item.familyId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location,
      expiryDate: item.expiryDate,
      createdBy: item.createdBy,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  },
};
