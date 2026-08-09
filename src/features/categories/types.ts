export type CategoryType = 'income' | 'expense';

export type Category = {
  id: string;
  notebookId: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
