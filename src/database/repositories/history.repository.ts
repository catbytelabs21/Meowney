import { database } from '@/database/database';
import type { AccountBalance } from '@/features/balance/types';
import type {
  MovementCategoryFilter,
  MovementItem,
} from '@/features/movements/types';
import type {
  MovementType,
  TransactionGroupType,
  TransactionType,
} from '@/features/transactions/types';

type AccountRow = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

type BalanceDeltaRow = {
  account_id: string;
  balance: number;
};

type CategoryRow = {
  id: string;
  name: string;
  type: TransactionType;
};

type MovementRow = {
  id: string;
  type: MovementType;
  amount: number;
  description: string | null;
  occurred_at: string;
  transaction_group_id: string | null;
  transaction_group_detached_at: string | null;
  transaction_group_type: TransactionGroupType | null;
  account_id: string;
  account_name: string;
  to_account_id: string | null;
  to_account_name: string | null;
  category_id: string | null;
  category_name: string | null;
};

function mapMovement(row: MovementRow): MovementItem {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    description: row.description,
    occurredAt: row.occurred_at,
    transactionGroupId: row.transaction_group_id,
    transactionGroupDetachedAt: row.transaction_group_detached_at,
    transactionGroupType: row.transaction_group_type,
    accountId: row.account_id,
    accountName: row.account_name,
    toAccountId: row.to_account_id,
    toAccountName: row.to_account_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
  };
}

export const historyRepository = {
  getBalancesByNotebookAtDate(notebookId: string, dateKey: string): AccountBalance[] {
    const accounts = database.getAllSync<AccountRow>(
      `
        SELECT id, name, icon, color
        FROM account
        WHERE notebook_id = ?
          AND archived_at IS NULL
        ORDER BY name COLLATE NOCASE ASC
      `,
      notebookId,
    );

    const transactionDeltas = database.getAllSync<BalanceDeltaRow>(
      `
        SELECT
          t.account_id,
          SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) AS balance
        FROM "transaction" t
        INNER JOIN account a ON a.id = t.account_id
        WHERE a.notebook_id = ?
          AND t.archived_at IS NULL
          AND a.archived_at IS NULL
          AND date(t.transaction_at) <= date(?)
        GROUP BY t.account_id
      `,
      notebookId,
      dateKey,
    );

    const transferDeltas = database.getAllSync<BalanceDeltaRow>(
      `
        SELECT account_id, SUM(balance) AS balance
        FROM (
          SELECT tr.from_account_id AS account_id, -tr.amount AS balance
          FROM transfer tr
          INNER JOIN account from_account ON from_account.id = tr.from_account_id
          INNER JOIN account to_account ON to_account.id = tr.to_account_id
          WHERE from_account.notebook_id = ?
            AND to_account.notebook_id = ?
            AND tr.archived_at IS NULL
            AND from_account.archived_at IS NULL
            AND to_account.archived_at IS NULL
            AND date(tr.transfer_at) <= date(?)
          UNION ALL
          SELECT tr.to_account_id AS account_id, tr.amount AS balance
          FROM transfer tr
          INNER JOIN account from_account ON from_account.id = tr.from_account_id
          INNER JOIN account to_account ON to_account.id = tr.to_account_id
          WHERE from_account.notebook_id = ?
            AND to_account.notebook_id = ?
            AND tr.archived_at IS NULL
            AND from_account.archived_at IS NULL
            AND to_account.archived_at IS NULL
            AND date(tr.transfer_at) <= date(?)
        )
        GROUP BY account_id
      `,
      notebookId,
      notebookId,
      dateKey,
      notebookId,
      notebookId,
      dateKey,
    );

    const balances = new Map<string, number>();
    [...transactionDeltas, ...transferDeltas].forEach((delta) => {
      balances.set(delta.account_id, (balances.get(delta.account_id) ?? 0) + (delta.balance ?? 0));
    });

    return accounts.map((account) => ({
      accountId: account.id,
      accountName: account.name,
      accountColor: account.color,
      accountIcon: account.icon,
      balance: balances.get(account.id) ?? 0,
    }));
  },

  listCategoriesByNotebook(notebookId: string): MovementCategoryFilter[] {
    const rows = database.getAllSync<CategoryRow>(
      `
        SELECT id, name, type
        FROM category
        WHERE notebook_id = ?
          AND archived_at IS NULL
        ORDER BY name COLLATE NOCASE ASC
      `,
      notebookId,
    );

    return rows;
  },

  listMovementsByNotebook(notebookId: string): MovementItem[] {
    const rows = database.getAllSync<MovementRow>(
      `
        SELECT *
        FROM (
          SELECT
            t.id,
            t.type,
            t.amount,
            t.description,
            t.transaction_at AS occurred_at,
            tgm.group_id AS transaction_group_id,
            tgm.detached_at AS transaction_group_detached_at,
            tg.type AS transaction_group_type,
            a.id AS account_id,
            a.name AS account_name,
            NULL AS to_account_id,
            NULL AS to_account_name,
            c.id AS category_id,
            c.name AS category_name
          FROM "transaction" t
          INNER JOIN account a ON a.id = t.account_id
          LEFT JOIN category c ON c.id = t.category_id AND c.archived_at IS NULL
          LEFT JOIN transaction_group_member tgm ON tgm.transaction_id = t.id
          LEFT JOIN transaction_group tg ON tg.id = tgm.group_id AND tg.archived_at IS NULL
          WHERE a.notebook_id = ?
            AND t.archived_at IS NULL
            AND a.archived_at IS NULL
          UNION ALL
          SELECT
            tr.id,
            'transfer' AS type,
            tr.amount,
            tr.description,
            tr.transfer_at AS occurred_at,
            NULL AS transaction_group_id,
            NULL AS transaction_group_detached_at,
            NULL AS transaction_group_type,
            from_account.id AS account_id,
            from_account.name AS account_name,
            to_account.id AS to_account_id,
            to_account.name AS to_account_name,
            NULL AS category_id,
            NULL AS category_name
          FROM transfer tr
          INNER JOIN account from_account ON from_account.id = tr.from_account_id
          INNER JOIN account to_account ON to_account.id = tr.to_account_id
          WHERE from_account.notebook_id = ?
            AND to_account.notebook_id = ?
            AND tr.archived_at IS NULL
            AND from_account.archived_at IS NULL
            AND to_account.archived_at IS NULL
        )
        ORDER BY datetime(occurred_at) DESC
      `,
      notebookId,
      notebookId,
      notebookId,
    );

    return rows.map(mapMovement);
  },
};

