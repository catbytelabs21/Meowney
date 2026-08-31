export type AccountBalance = {
  accountId: string;
  accountName: string;
  accountColor: string | null;
  accountIcon: string | null;
  balance: number;
};

export type DailyAccountBalance = {
  balances: AccountBalance[];
  dateKey: string;
};
