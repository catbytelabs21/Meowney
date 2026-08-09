export type Goal = {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  targetAmount: number;
  targetDate: string;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
