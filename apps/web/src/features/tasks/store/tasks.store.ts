import { create } from 'zustand';
import type { TaskStatus } from '../types';

interface TaskFilters {
  status: TaskStatus | 'ALL';
  assigneeId: string | 'ALL';
}

interface TasksState {
  filters: TaskFilters;
  setStatusFilter: (status: TaskStatus | 'ALL') => void;
  setAssigneeFilter: (assigneeId: string | 'ALL') => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: TaskFilters = {
  status: 'ALL',
  assigneeId: 'ALL',
};

export const useTasksStore = create<TasksState>((set) => ({
  filters: { ...DEFAULT_FILTERS },
  setStatusFilter: (status) =>
    set((s) => ({ filters: { ...s.filters, status } })),
  setAssigneeFilter: (assigneeId) =>
    set((s) => ({ filters: { ...s.filters, assigneeId } })),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
}));
