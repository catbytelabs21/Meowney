export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly' | 'custom';

export type Budget = {
  id: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
