import { database } from '@/database/database';
import type { Budget, BudgetListItem, BudgetPeriod } from '@/features/budgets/types';

type BudgetRow = {
  id: string;
  category_id: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type BudgetListRow = BudgetRow & {
  category_color: string | null;
  category_icon: string | null;
  category_name: string;
};

export type BudgetInput = {
  amount: number;
  categoryId: string;
  endDate: string | null;
  period: BudgetPeriod;
  startDate: string;
};

function mapBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    amount: row.amount,
    period: row.period,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapBudgetListItem(row: BudgetListRow): BudgetListItem {
  return {
    ...mapBudget(row),
    categoryColor: row.category_color,
    categoryIcon: row.category_icon,
    categoryName: row.category_name,
  };
}

function createId() {
  return `budget_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export const budgetRepository = {
  listActiveByNotebook(notebookId: string) {
    const rows = database.getAllSync<BudgetListRow>(
      `
        SELECT
          b.*,
          c.name AS category_name,
          c.icon AS category_icon,
          c.color AS category_color
        FROM budget b
        INNER JOIN category c ON c.id = b.category_id
        WHERE c.notebook_id = ?
          AND b.archived_at IS NULL
          AND c.archived_at IS NULL
        ORDER BY datetime(b.updated_at) DESC, c.name COLLATE NOCASE ASC
      `,
      notebookId,
    );

    return rows.map(mapBudgetListItem);
  },

  getSpentAmount(id: string, excludeTransactionId?: string | null) {
    const budget = database.getFirstSync<BudgetRow>(
      `
        SELECT *
        FROM budget
        WHERE id = ?
          AND archived_at IS NULL
      `,
      id,
    );

    if (!budget) {
      return 0;
    }

    const row = database.getFirstSync<{ total: number | null }>(
      `
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM "transaction"
        WHERE category_id = ?
          AND type = 'expense'
          AND archived_at IS NULL
          AND date(transaction_at) >= date(?)
          AND (? IS NULL OR date(transaction_at) <= date(?))
          AND (? IS NULL OR id != ?)
      `,
      budget.category_id,
      budget.start_date,
      budget.end_date,
      budget.end_date,
      excludeTransactionId ?? null,
      excludeTransactionId ?? null,
    );

    return row?.total ?? 0;
  },

  create(input: BudgetInput) {
    const createdAt = nowIso();
    const budget: Budget = {
      id: createId(),
      categoryId: input.categoryId,
      amount: input.amount,
      period: input.period,
      startDate: input.startDate,
      endDate: input.endDate,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };

    database.runSync(
      `
        INSERT INTO budget (
          id,
          category_id,
          amount,
          period,
          start_date,
          end_date,
          created_at,
          updated_at,
          archived_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      budget.id,
      budget.categoryId,
      budget.amount,
      budget.period,
      budget.startDate,
      budget.endDate,
      budget.createdAt,
      budget.updatedAt,
    );

    return budget;
  },

  update(id: string, input: BudgetInput) {
    const updatedAt = nowIso();

    database.runSync(
      `
        UPDATE budget
        SET
          category_id = ?,
          amount = ?,
          period = ?,
          start_date = ?,
          end_date = ?,
          updated_at = ?
        WHERE id = ?
          AND archived_at IS NULL
      `,
      input.categoryId,
      input.amount,
      input.period,
      input.startDate,
      input.endDate,
      updatedAt,
      id,
    );
  },

  archive(id: string) {
    const archivedAt = nowIso();

    database.runSync(
      `
        UPDATE budget
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
