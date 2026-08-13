export type Notebook = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  currency: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
