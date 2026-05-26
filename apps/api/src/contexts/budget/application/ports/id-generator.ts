export interface BudgetIdGenerator {
  generate(): string;
}

export const BUDGET_ID_GENERATOR = Symbol('BudgetIdGenerator');
