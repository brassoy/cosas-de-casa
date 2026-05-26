import { create } from 'zustand';

interface CalendarState {
  /** Año del mes visible actualmente en la vista mensual. */
  viewYear: number;
  /** Mes visible (0-indexed, igual que Date.prototype.getMonth). */
  viewMonth: number;
  /** Vista activa: 'month' (grid) o 'agenda' (lista de próximos eventos). */
  activeView: 'month' | 'agenda';
  /** Día seleccionado (para el panel lateral de eventos del día). null = ninguno. */
  selectedDate: Date | null;

  // Acciones
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  setActiveView: (view: 'month' | 'agenda') => void;
  setSelectedDate: (date: Date | null) => void;
}

function today() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}

export const useCalendarStore = create<CalendarState>((set) => {
  const { year, month } = today();
  return {
    viewYear: year,
    viewMonth: month,
    activeView: 'month',
    selectedDate: null,

    goToPrevMonth: () =>
      set((s) => {
        const prev = new Date(s.viewYear, s.viewMonth - 1, 1);
        return { viewYear: prev.getFullYear(), viewMonth: prev.getMonth(), selectedDate: null };
      }),

    goToNextMonth: () =>
      set((s) => {
        const next = new Date(s.viewYear, s.viewMonth + 1, 1);
        return { viewYear: next.getFullYear(), viewMonth: next.getMonth(), selectedDate: null };
      }),

    goToToday: () => {
      const { year: y, month: m } = today();
      set({ viewYear: y, viewMonth: m, selectedDate: new Date() });
    },

    setActiveView: (view) => set({ activeView: view }),
    setSelectedDate: (date) => set({ selectedDate: date }),
  };
});
