import { create } from 'zustand';
import type { FridgeLocation } from '@cosasdecasa/contracts';

interface FridgeFilters {
  location: FridgeLocation | 'ALL';
}

interface FridgeState {
  filters: FridgeFilters;
  setLocationFilter: (location: FridgeLocation | 'ALL') => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: FridgeFilters = {
  location: 'ALL',
};

export const useFridgeStore = create<FridgeState>((set) => ({
  filters: { ...DEFAULT_FILTERS },
  setLocationFilter: (location) =>
    set((s) => ({ filters: { ...s.filters, location } })),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
}));
