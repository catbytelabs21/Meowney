export const NOTEBOOK_TABLE = 'notebook';

export const notebookColumns = {
  id: 'id',
  name: 'name',
  description: 'description',
  icon: 'icon',
  color: 'color',
  currency: 'currency',
  isDefault: 'is_default',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  archivedAt: 'archived_at',
} as const;
