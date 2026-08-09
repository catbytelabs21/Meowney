export const BUDGET_TABLE = 'budget';

export const budgetColumns = {
  id: 'id',
  categoryId: 'category_id',
  amount: 'amount',
  period: 'period',
  startDate: 'start_date',
  endDate: 'end_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  archivedAt: 'archived_at',
} as const;
