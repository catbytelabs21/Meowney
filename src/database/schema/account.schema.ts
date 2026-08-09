export const ACCOUNT_TABLE = 'account';

export const accountColumns = {
  id: 'id',
  notebookId: 'notebook_id',
  name: 'name',
  description: 'description',
  icon: 'icon',
  color: 'color',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  archivedAt: 'archived_at',
} as const;
