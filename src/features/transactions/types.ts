export type TransactionType = 'income' | 'expense';
export type MovementType = TransactionType | 'transfer';
export type TransactionGroupType = 'recurring';

export type Transaction = {
  id: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  transactionAt: string;
  transactionGroupId: string | null;
  transactionGroupDetachedAt: string | null;
  transactionGroupType: TransactionGroupType | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type Transfer = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string | null;
  transferAt: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type MovementListItem = {
  id: string;
  type: MovementType;
  amount: number;
  description: string | null;
  occurredAt: string;
  accountName: string;
  toAccountName: string | null;
  transactionGroupId: string | null;
  transactionGroupDetachedAt: string | null;
  transactionGroupType: TransactionGroupType | null;
  createdAt: string;
  updatedAt: string;
};
