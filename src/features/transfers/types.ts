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
