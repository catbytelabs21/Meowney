import { database } from '@/database/database';

const domainTablesInDeleteOrder = [
  'transaction_group_member',
  'transaction_group',
  'transfer',
  '"transaction"',
  'budget',
  'goal',
  'account',
  'category',
  'notebook',
] as const;

export const appDataRepository = {
  deleteAllDomainData() {
    database.withTransactionSync(() => {
      domainTablesInDeleteOrder.forEach((tableName) => {
        database.execSync(`DELETE FROM ${tableName}`);
      });
    });
  },
};
