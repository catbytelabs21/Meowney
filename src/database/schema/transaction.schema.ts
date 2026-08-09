export const TRANSACTION_TABLE = 'transaction';

export const transactionColumns = {
  id: 'id',
  accountId: 'account_id',
  categoryId: 'category_id',
  type: 'type',
  amount: 'amount',
  description: 'description',
  transactionAt: 'transaction_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  archivedAt: 'archived_at',
} as const;
