export type AccountType =
  | 'CASH'
  | 'BANK_ACCOUNT'
  | 'DEBIT_CARD'
  | 'DIGITAL_WALLET'
  | 'SAVINGS'
  | 'INVESTMENT'
  | 'OTHER';

export type Account = {
  id: string;
  notebookId: string;
  name: string;
  description: string | null;
  type: AccountType;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
