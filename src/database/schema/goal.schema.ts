export const GOAL_TABLE = 'goal';

export const goalColumns = {
  id: 'id',
  accountId: 'account_id',
  name: 'name',
  description: 'description',
  targetAmount: 'target_amount',
  targetDate: 'target_date',
  icon: 'icon',
  color: 'color',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  archivedAt: 'archived_at',
} as const;
