import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// TODO(contracts): añadir FamilyDto a las exportaciones del contrato cuando
// el backend lo estabilice. Por ahora duplicamos la forma mínima necesaria.
interface ActiveFamily {
  id: string;
  name: string;
}

interface FamilyState {
  activeFamily: ActiveFamily | null;
  setActiveFamily: (family: ActiveFamily | null) => void;
  clearFamily: () => void;
}

const STORAGE_KEY = 'cosasdecasa:active-family';

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      activeFamily: null,
      setActiveFamily: (family) => set({ activeFamily: family }),
      clearFamily: () => set({ activeFamily: null }),
    }),
    { name: STORAGE_KEY },
  ),
);
