export interface BudgetClock {
  now(): Date;
}

export const BUDGET_CLOCK = Symbol('BudgetClock');
