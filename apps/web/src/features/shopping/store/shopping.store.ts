import { create } from 'zustand';

interface ShoppingUiState {
  /** ID del ítem cuyo detalle/sheet está abierto. */
  openItemId: string | null;
  openItem: (id: string) => void;
  closeItem: () => void;
}

export const useShoppingStore = create<ShoppingUiState>()((set) => ({
  openItemId: null,
  openItem: (id) => set({ openItemId: id }),
  closeItem: () => set({ openItemId: null }),
}));
