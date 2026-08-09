export type TransactionType = 'income' | 'expense';

export type Transaction = {
  id: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  transactionAt: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
