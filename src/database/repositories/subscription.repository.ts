import { database } from '@/database/database';
import type { Subscription, SubscriptionFrequency } from '@/features/subscriptions/types';

type SubscriptionRow = {
  id: string;
  notebook_id: string;
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

export type SubscriptionInput = {
  amount: number;
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

function createId() {
  return `subscription_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export const subscriptionRepository = {
  listActiveByNotebook(notebookId: string) {
    const rows = database.getAllSync<SubscriptionRow>(
      `
        SELECT *
        FROM subscription
        WHERE notebook_id = ?
          AND archived_at IS NULL
        ORDER BY datetime(updated_at) DESC, name COLLATE NOCASE ASC
      `,
      notebookId,
    );

    return rows.map(mapSubscription);
  },

  create(notebookId: string, input: SubscriptionInput) {
    const createdAt = nowIso();
    const subscription: Subscription = {
      id: createId(),
      notebookId,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      subscription.id,
      subscription.notebookId,
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
