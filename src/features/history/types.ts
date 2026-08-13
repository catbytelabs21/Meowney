import type { MovementType } from '@/features/transactions/types';

export type HistoryAccountBalance = {
  accountId: string;
  accountName: string;
  accountColor: string | null;
  accountIcon: string | null;
  balance: number;
};

export type HistoryCategoryFilter = {
  id: string;
  name: string;
  type: 'income' | 'expense';
};

export type HistoryMovementItem = {
  id: string;
  type: MovementType;
  amount: number;
  description: string | null;
  occurredAt: string;
  accountId: string;
  accountName: string;
  toAccountId: string | null;
  toAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
};
