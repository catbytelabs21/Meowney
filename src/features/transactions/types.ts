export type Transaction = {
  id: string;
  accountId: string;
  categoryId: string | null;
  amount: number;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};
