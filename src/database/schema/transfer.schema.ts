export const TRANSFER_TABLE = 'transfer';

export const transferColumns = {
  id: 'id',
  fromAccountId: 'from_account_id',
  toAccountId: 'to_account_id',
  amount: 'amount',
  description: 'description',
  transferAt: 'transfer_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  archivedAt: 'archived_at',
} as const;
