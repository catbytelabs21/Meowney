import { database } from '@/database/database';
import type { MovementListItem, Transaction, TransactionType } from '@/features/transactions/types';

type TransactionRow = {
  id: string;
  account_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  transaction_at: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type MovementRow = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  occurred_at: string;
  account_name: string;
  created_at: string;
  updated_at: string;
};

export type TransactionInput = {
  accountId: string;
  amount: number;
  categoryId: string;
  description: string | null;
  transactionAt: string;
  type: TransactionType;
};

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    categoryId: row.category_id,
    type: row.type,
    amount: row.amount,
    description: row.description,
    transactionAt: row.transaction_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapMovement(row: MovementRow): MovementListItem {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    description: row.description,
    occurredAt: row.occurred_at,
    accountName: row.account_name,
    toAccountName: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createId() {
  return `transaction_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export const transactionRepository = {
  listActiveByNotebookAndDate(notebookId: string, dateKey: string) {
    const rows = database.getAllSync<MovementRow>(
      `
        SELECT
          t.id,
          t.type,
          t.amount,
          t.description,
          t.transaction_at AS occurred_at,
          a.name AS account_name,
          t.created_at,
          t.updated_at
        FROM "transaction" t
        INNER JOIN account a ON a.id = t.account_id
        WHERE a.notebook_id = ?
          AND t.archived_at IS NULL
          AND a.archived_at IS NULL
          AND date(t.transaction_at) = date(?)
        ORDER BY datetime(t.transaction_at) DESC, datetime(t.created_at) DESC
      `,
      notebookId,
      dateKey,
    );

    return rows.map(mapMovement);
  },

  listActiveDatesByNotebook(notebookId: string) {
    const rows = database.getAllSync<{ date_key: string; count: number }>(
      `
        SELECT date(t.transaction_at) AS date_key, COUNT(*) AS count
        FROM "transaction" t
        INNER JOIN account a ON a.id = t.account_id
        WHERE a.notebook_id = ?
          AND t.archived_at IS NULL
          AND a.archived_at IS NULL
        GROUP BY date(t.transaction_at)
        ORDER BY date_key DESC
      `,
      notebookId,
    );

    return rows;
  },

  listActiveDatesByNotebookAndType(notebookId: string, type: TransactionType) {
    const rows = database.getAllSync<{ date_key: string; count: number }>(
      `
        SELECT date(t.transaction_at) AS date_key, COUNT(*) AS count
        FROM "transaction" t
        INNER JOIN account a ON a.id = t.account_id
        WHERE a.notebook_id = ?
          AND t.type = ?
          AND t.archived_at IS NULL
          AND a.archived_at IS NULL
        GROUP BY date(t.transaction_at)
        ORDER BY date_key DESC
      `,
      notebookId,
      type,
    );

    return rows;
  },

  getActiveById(id: string) {
    const row = database.getFirstSync<TransactionRow>(
      `
        SELECT *
        FROM "transaction"
        WHERE id = ?
          AND archived_at IS NULL
      `,
      id,
    );

    return row ? mapTransaction(row) : null;
  },

  create(input: TransactionInput) {
    const createdAt = nowIso();
    const transaction: Transaction = {
      id: createId(),
      accountId: input.accountId,
      categoryId: input.categoryId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      transactionAt: input.transactionAt,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };

    database.runSync(
      `
        INSERT INTO "transaction" (
          id,
          account_id,
          category_id,
          type,
          amount,
          description,
          transaction_at,
          created_at,
          updated_at,
          archived_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      transaction.id,
      transaction.accountId,
      transaction.categoryId,
      transaction.type,
      transaction.amount,
      transaction.description,
      transaction.transactionAt,
      transaction.createdAt,
      transaction.updatedAt,
    );

    return transaction;
  },

  update(id: string, input: TransactionInput) {
    const updatedAt = nowIso();

    database.runSync(
      `
        UPDATE "transaction"
        SET
          account_id = ?,
          category_id = ?,
          type = ?,
          amount = ?,
          description = ?,
          transaction_at = ?,
          updated_at = ?
        WHERE id = ?
          AND archived_at IS NULL
      `,
      input.accountId,
      input.categoryId,
      input.type,
      input.amount,
      input.description,
      input.transactionAt,
      updatedAt,
      id,
    );
  },

  archive(id: string) {
    const archivedAt = nowIso();

    database.runSync(
      `
        UPDATE "transaction"
        SET archived_at = ?, updated_at = ?
        WHERE id = ?
          AND archived_at IS NULL
      `,
      archivedAt,
      archivedAt,
      id,
    );
  },
};
