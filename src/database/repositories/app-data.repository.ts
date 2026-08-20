import { database } from '@/database/database';
import { bootstrapStarterData } from '@/database/bootstrap';

const domainTablesInDeleteOrder = [
  'transaction_group_member',
  'transaction_group',
  'transfer',
  '"transaction"',
  'budget',
  'goal',
  'subscription',
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

    bootstrapStarterData();
  },
};
