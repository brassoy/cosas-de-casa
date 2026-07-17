import { create } from 'zustand';
import { startOfWeekMonday } from '../types';

/** Vista activa: 'week' (semana, por defecto en móvil), 'month' (grid) o 'agenda'. */
export type CalendarActiveView = 'week' | 'month' | 'agenda';

interface CalendarState {
  /** Año del mes visible actualmente en la vista mensual. */
  viewYear: number;
  /** Mes visible (0-indexed, igual que Date.prototype.getMonth). */
  viewMonth: number;
  /**
   * Lunes de la semana visible en la vista semanal. Se mantiene sincronizado con
   * viewYear/viewMonth: al navegar semanas, viewMonth apunta al mes del lunes de
   * la semana, de modo que la query mensual (cacheada por mes) siempre cubre la
   * semana visible sin necesidad de una query aparte.
   */
  weekStart: Date;
  /** Vista activa: 'week' (por defecto), 'month' (grid) o 'agenda'. */
  activeView: CalendarActiveView;
  /** Día seleccionado (para el panel lateral de eventos del día). null = ninguno. */
  selectedDate: Date | null;

  // Acciones
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  goToToday: () => void;
  setActiveView: (view: CalendarActiveView) => void;
  setSelectedDate: (date: Date | null) => void;
}

export const useCalendarStore = create<CalendarState>((set) => {
  const now = new Date();
  return {
    viewYear: now.getFullYear(),
    viewMonth: now.getMonth(),
    weekStart: startOfWeekMonday(now),
    // Semana por defecto: en móvil el mes completo no se ve bien.
    activeView: 'week',
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

    goToPrevWeek: () =>
      set((s) => {
        const ws = new Date(s.weekStart);
        ws.setDate(ws.getDate() - 7);
        // viewMonth = mes del lunes → la query mensual cubre la semana entera
        // (una semana siempre cae dentro de la grilla de 6 semanas de su mes).
        return {
          weekStart: ws,
          viewYear: ws.getFullYear(),
          viewMonth: ws.getMonth(),
          selectedDate: null,
        };
      }),

    goToNextWeek: () =>
      set((s) => {
        const ws = new Date(s.weekStart);
        ws.setDate(ws.getDate() + 7);
        return {
          weekStart: ws,
          viewYear: ws.getFullYear(),
          viewMonth: ws.getMonth(),
          selectedDate: null,
        };
      }),

    goToToday: () => {
      const d = new Date();
      set({
        viewYear: d.getFullYear(),
        viewMonth: d.getMonth(),
        weekStart: startOfWeekMonday(d),
        selectedDate: new Date(),
      });
    },

    setActiveView: (view) => set({ activeView: view }),
    setSelectedDate: (date) => set({ selectedDate: date }),
  };
});
