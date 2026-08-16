import { database } from '@/database/database';
import type {
  MovementListItem,
  Transaction,
  TransactionGroupType,
  TransactionType,
} from '@/features/transactions/types';

type TransactionRow = {
  id: string;
  account_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  transaction_at: string;
  transaction_group_id: string | null;
  transaction_group_detached_at: string | null;
  transaction_group_type: TransactionGroupType | null;
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
  transaction_group_id: string | null;
  transaction_group_detached_at: string | null;
  transaction_group_type: TransactionGroupType | null;
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

type TransactionGroup = {
  id: string;
  type: TransactionGroupType;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
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
    transactionGroupId: row.transaction_group_id,
    transactionGroupDetachedAt: row.transaction_group_detached_at,
    transactionGroupType: row.transaction_group_type,
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
    transactionGroupId: row.transaction_group_id,
    transactionGroupDetachedAt: row.transaction_group_detached_at,
    transactionGroupType: row.transaction_group_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createId() {
  return `transaction_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function createGroupId() {
  return `transaction_group_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function createGroupMemberId() {
  return `transaction_group_member_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function insertTransactionGroup(group: TransactionGroup) {
  database.runSync(
    `
      INSERT INTO transaction_group (
        id,
        type,
        created_at,
        updated_at,
        archived_at
      )
      VALUES (?, ?, ?, ?, NULL)
    `,
    group.id,
    group.type,
    group.createdAt,
    group.updatedAt,
  );
}

function insertTransactionGroupMember(
  groupId: string,
  transactionId: string,
  createdAt: string,
) {
  database.runSync(
    `
      INSERT INTO transaction_group_member (
        id,
        group_id,
        transaction_id,
        detached_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, NULL, ?, ?)
    `,
    createGroupMemberId(),
    groupId,
    transactionId,
    createdAt,
    createdAt,
  );
}

function insertTransaction(transaction: Transaction) {
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
          tgm.group_id AS transaction_group_id,
          tgm.detached_at AS transaction_group_detached_at,
          tg.type AS transaction_group_type,
          t.created_at,
          t.updated_at
        FROM "transaction" t
        INNER JOIN account a ON a.id = t.account_id
        LEFT JOIN transaction_group_member tgm ON tgm.transaction_id = t.id
        LEFT JOIN transaction_group tg ON tg.id = tgm.group_id AND tg.archived_at IS NULL
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
        SELECT
          t.*,
          tgm.group_id AS transaction_group_id,
          tgm.detached_at AS transaction_group_detached_at,
          tg.type AS transaction_group_type
        FROM "transaction" t
        LEFT JOIN transaction_group_member tgm ON tgm.transaction_id = t.id
        LEFT JOIN transaction_group tg ON tg.id = tgm.group_id AND tg.archived_at IS NULL
        WHERE t.id = ?
          AND t.archived_at IS NULL
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
      transactionGroupId: null,
      transactionGroupDetachedAt: null,
      transactionGroupType: null,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };

    insertTransaction(transaction);

    return transaction;
  },

  createMany(inputs: TransactionInput[]) {
    const createdAt = nowIso();
    const transactions = inputs.map((input): Transaction => ({
      id: createId(),
      accountId: input.accountId,
      categoryId: input.categoryId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      transactionAt: input.transactionAt,
      transactionGroupId: null,
      transactionGroupDetachedAt: null,
      transactionGroupType: null,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    }));

    database.withTransactionSync(() => {
      transactions.forEach(insertTransaction);
    });

    return transactions;
  },

  createRecurring(inputs: TransactionInput[]) {
    const createdAt = nowIso();
    const group: TransactionGroup = {
      id: createGroupId(),
      type: 'recurring',
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };
    const transactions = inputs.map((input): Transaction => ({
      id: createId(),
      accountId: input.accountId,
      categoryId: input.categoryId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      transactionAt: input.transactionAt,
      transactionGroupId: group.id,
      transactionGroupDetachedAt: null,
      transactionGroupType: group.type,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    }));

    database.withTransactionSync(() => {
      insertTransactionGroup(group);
      transactions.forEach((transaction) => {
        insertTransaction(transaction);
        insertTransactionGroupMember(group.id, transaction.id, createdAt);
      });
    });

    return transactions;
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

  updateAndDetach(id: string, input: TransactionInput) {
    const updatedAt = nowIso();

    database.withTransactionSync(() => {
      this.update(id, input);
      database.runSync(
        `
          UPDATE transaction_group_member
          SET detached_at = COALESCE(detached_at, ?),
            updated_at = ?
          WHERE transaction_id = ?
            AND detached_at IS NULL
        `,
        updatedAt,
        updatedAt,
        id,
      );
    });
  },

  updateRecurringFuture(
    groupId: string,
    fromTransactionAt: string,
    selectedTransactionId: string,
    input: TransactionInput,
  ) {
    const updatedAt = nowIso();

    database.withTransactionSync(() => {
      database.runSync(
        `
          UPDATE "transaction"
          SET
            account_id = ?,
            category_id = ?,
            type = ?,
            amount = ?,
            description = ?,
            updated_at = ?
          WHERE id IN (
            SELECT t.id
            FROM "transaction" t
            INNER JOIN transaction_group_member tgm ON tgm.transaction_id = t.id
            WHERE tgm.group_id = ?
              AND tgm.detached_at IS NULL
              AND t.archived_at IS NULL
              AND datetime(t.transaction_at) >= datetime(?)
          )
        `,
        input.accountId,
        input.categoryId,
        input.type,
        input.amount,
        input.description,
        updatedAt,
        groupId,
        fromTransactionAt,
      );
      this.update(selectedTransactionId, input);
    });
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

  archiveAndDetach(id: string) {
    const archivedAt = nowIso();

    database.withTransactionSync(() => {
      database.runSync(
        `
          UPDATE transaction_group_member
          SET detached_at = COALESCE(detached_at, ?),
            updated_at = ?
          WHERE transaction_id = ?
            AND detached_at IS NULL
        `,
        archivedAt,
        archivedAt,
        id,
      );
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
    });
  },

  archiveRecurringFuture(groupId: string, fromTransactionAt: string) {
    const archivedAt = nowIso();

    database.runSync(
      `
        UPDATE "transaction"
        SET archived_at = ?, updated_at = ?
        WHERE id IN (
          SELECT t.id
          FROM "transaction" t
          INNER JOIN transaction_group_member tgm ON tgm.transaction_id = t.id
          WHERE tgm.group_id = ?
            AND tgm.detached_at IS NULL
            AND t.archived_at IS NULL
            AND datetime(t.transaction_at) >= datetime(?)
        )
      `,
      archivedAt,
      archivedAt,
      groupId,
      fromTransactionAt,
    );
  },
};
