import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Subconjunto mínimo de GroupSummaryDto necesario para la sesión activa. */
interface ActiveGroup {
  id: string;
  name: string;
}

interface GroupsState {
  activeGroup: ActiveGroup | null;
  setActiveGroup: (group: ActiveGroup | null) => void;
  clearGroup: () => void;
}

const STORAGE_KEY = 'cosasdecasa:active-group';

export const useGroupsStore = create<GroupsState>()(
  persist(
    (set) => ({
      activeGroup: null,
      setActiveGroup: (group) => set({ activeGroup: group }),
      clearGroup: () => set({ activeGroup: null }),
    }),
    { name: STORAGE_KEY },
  ),
);
