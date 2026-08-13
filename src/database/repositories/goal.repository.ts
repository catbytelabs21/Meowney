import { database } from '@/database/database';
import type { Goal, GoalListItem } from '@/features/goals/types';

type GoalRow = {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  target_date: string;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type GoalListRow = GoalRow & {
  account_name: string;
};

export type GoalInput = {
  accountId: string;
  color: string | null;
  description: string | null;
  icon: string | null;
  name: string;
  targetAmount: number;
  targetDate: string;
};

function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.name,
    description: row.description,
    targetAmount: row.target_amount,
    targetDate: row.target_date,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapGoalListItem(row: GoalListRow): GoalListItem {
  return {
    ...mapGoal(row),
    accountName: row.account_name,
  };
}

function createId() {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export const goalRepository = {
  listActiveByNotebook(notebookId: string) {
    const rows = database.getAllSync<GoalListRow>(
      `
        SELECT
          g.*,
          a.name AS account_name
        FROM goal g
        INNER JOIN account a ON a.id = g.account_id
        WHERE a.notebook_id = ?
          AND g.archived_at IS NULL
          AND a.archived_at IS NULL
        ORDER BY datetime(g.updated_at) DESC, g.name COLLATE NOCASE ASC
      `,
      notebookId,
    );

    return rows.map(mapGoalListItem);
  },

  create(input: GoalInput) {
    const createdAt = nowIso();
    const goal: Goal = {
      id: createId(),
      accountId: input.accountId,
      name: input.name,
      description: input.description,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate,
      icon: input.icon,
      color: input.color,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };

    database.runSync(
      `
        INSERT INTO goal (
          id,
          account_id,
          name,
          description,
          target_amount,
          target_date,
          icon,
          color,
          created_at,
          updated_at,
          archived_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      goal.id,
      goal.accountId,
      goal.name,
      goal.description,
      goal.targetAmount,
      goal.targetDate,
      goal.icon,
      goal.color,
      goal.createdAt,
      goal.updatedAt,
    );

    return goal;
  },

  update(id: string, input: GoalInput) {
    const updatedAt = nowIso();

    database.runSync(
      `
        UPDATE goal
        SET
          account_id = ?,
          name = ?,
          description = ?,
          target_amount = ?,
          target_date = ?,
          icon = ?,
          color = ?,
          updated_at = ?
        WHERE id = ?
          AND archived_at IS NULL
      `,
      input.accountId,
      input.name,
      input.description,
      input.targetAmount,
      input.targetDate,
      input.icon,
      input.color,
      updatedAt,
      id,
    );
  },

  archive(id: string) {
    const archivedAt = nowIso();

    database.runSync(
      `
        UPDATE goal
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
