import { create } from 'zustand';

interface BudgetState {
  /** Filtro de mes activo para la vista de gasto (formato YYYY-MM, vacío = todos). */
  monthFilter: string;
  setMonthFilter: (month: string) => void;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  monthFilter: '',
  setMonthFilter: (month) => set({ monthFilter: month }),
}));
