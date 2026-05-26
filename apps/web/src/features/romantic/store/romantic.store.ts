import { create } from 'zustand';

type RomanticTab = 'challenges' | 'notes';

interface RomanticState {
  /** Pestaña activa del rincón de pareja. */
  activeTab: RomanticTab;
  setActiveTab: (tab: RomanticTab) => void;
}

export const useRomanticStore = create<RomanticState>((set) => ({
  activeTab: 'challenges',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
