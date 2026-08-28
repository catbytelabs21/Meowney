import { database } from '@/database/database';
import type { Subscription, SubscriptionFrequency, SubscriptionListItem } from '@/features/subscriptions/types';

type SubscriptionRow = {
  id: string;
  notebook_id: string;
  category_id: string;
  name: string;
  amount: number;
  payment_frequency: SubscriptionFrequency;
  notes: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type SubscriptionListRow = SubscriptionRow & {
  category_color: string | null;
  category_icon: string | null;
  category_name: string;
};

export type SubscriptionInput = {
  amount: number;
  categoryId: string;
  color: string | null;
  icon: string | null;
  name: string;
  notes: string | null;
  paymentFrequency: SubscriptionFrequency;
};

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    notebookId: row.notebook_id,
    categoryId: row.category_id,
    name: row.name,
    amount: row.amount,
    paymentFrequency: row.payment_frequency,
    notes: row.notes,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapSubscriptionListItem(row: SubscriptionListRow): SubscriptionListItem {
  return {
    ...mapSubscription(row),
    categoryColor: row.category_color,
    categoryIcon: row.category_icon,
    categoryName: row.category_name,
  };
}

function createId() {
  return `subscription_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export const subscriptionRepository = {
  listActiveByNotebook(notebookId: string) {
    const rows = database.getAllSync<SubscriptionListRow>(
      `
        SELECT
          s.*,
          COALESCE(parent.name || ' / ' || c.name, c.name) AS category_name,
          c.icon AS category_icon,
          c.color AS category_color
        FROM subscription s
        INNER JOIN category c ON c.id = s.category_id
        LEFT JOIN category parent ON parent.id = c.parent_id
        WHERE s.notebook_id = ?
          AND s.archived_at IS NULL
          AND c.archived_at IS NULL
        ORDER BY datetime(s.updated_at) DESC, s.name COLLATE NOCASE ASC
      `,
      notebookId,
    );

    return rows.map(mapSubscriptionListItem);
  },

  create(notebookId: string, input: SubscriptionInput) {
    const createdAt = nowIso();
    const subscription: Subscription = {
      id: createId(),
      notebookId,
      categoryId: input.categoryId,
      name: input.name,
      amount: input.amount,
      paymentFrequency: input.paymentFrequency,
      notes: input.notes,
      icon: input.icon,
      color: input.color,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };

    database.runSync(
      `
        INSERT INTO subscription (
          id,
          notebook_id,
          category_id,
          name,
          amount,
          payment_frequency,
          notes,
          icon,
          color,
          created_at,
          updated_at,
          archived_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      subscription.id,
      subscription.notebookId,
      subscription.categoryId,
      subscription.name,
      subscription.amount,
      subscription.paymentFrequency,
      subscription.notes,
      subscription.icon,
      subscription.color,
      subscription.createdAt,
      subscription.updatedAt,
    );

    return subscription;
  },

  update(id: string, input: SubscriptionInput) {
    const updatedAt = nowIso();

    database.runSync(
      `
        UPDATE subscription
        SET
          name = ?,
          category_id = ?,
          amount = ?,
          payment_frequency = ?,
          notes = ?,
          icon = ?,
          color = ?,
          updated_at = ?
        WHERE id = ?
          AND archived_at IS NULL
      `,
      input.name,
      input.categoryId,
      input.amount,
      input.paymentFrequency,
      input.notes,
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
        UPDATE subscription
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
