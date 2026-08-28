export type SubscriptionFrequency = 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';

export type Subscription = {
  id: string;
  notebookId: string;
  categoryId: string;
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

export type SubscriptionListItem = Subscription & {
  categoryColor: string | null;
  categoryIcon: string | null;
  categoryName: string;
};
