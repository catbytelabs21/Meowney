import type {
  MovementType,
  TransactionGroupType,
} from "@/features/transactions/types";

export type MovementCategoryFilter = {
  id: string;
  name: string;
  parentId: string | null;
  type: "income" | "expense";
};

export type MovementItem = {
  id: string;
  type: MovementType;
  amount: number;
  description: string | null;
  occurredAt: string;
  transactionGroupId: string | null;
  transactionGroupDetachedAt: string | null;
  transactionGroupType: TransactionGroupType | null;
  accountId: string;
  accountName: string;
  toAccountId: string | null;
  toAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
};

