export type SubscriptionFrequency = 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export type Subscription = {
  id: string;
  notebookId: string;
  name: string;
  amount: number;
  paymentFrequency: SubscriptionFrequency;
  notes: string | null;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
