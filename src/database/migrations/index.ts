import { createNotebookTable } from './001_create_notebook_table';
import { createAccountTable } from './002_create_account_table';
import { createCategoryTable } from './003_create_category_table';
import { createTransactionTable } from './004_create_transaction_table';
import { createTransferTable } from './005_create_transfer_table';
import { createBudgetTable } from './006_create_budget_table';
import { createGoalTable } from './007_create_goal_table';
import { addAccountType } from './009_add_account_type';
import { moveDefaultNotebookToNotebook } from './012_move_default_notebook_to_notebook';
import { createTransactionGroupTables } from './013_create_transaction_group_tables';
import { createAppSettingTable } from './014_create_app_setting_table';
import { allowSavingsAccountType } from './015_allow_savings_account_type';
import type { SQLiteDatabase } from 'expo-sqlite';

export type Migration = {
  version: number;
  name: string;
  sql?: string;
  apply?: (database: SQLiteDatabase) => void;
};

export const migrations: Migration[] = [
  createNotebookTable,
  createAccountTable,
  createCategoryTable,
  createTransactionTable,
  createTransferTable,
  createBudgetTable,
  createGoalTable,
  addAccountType,
  moveDefaultNotebookToNotebook,
  createTransactionGroupTables,
  createAppSettingTable,
  allowSavingsAccountType,
];
