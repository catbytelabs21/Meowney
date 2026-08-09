export const CATEGORY_TABLE = 'category';

export const categoryColumns = {
  id: 'id',
  notebookId: 'notebook_id',
  name: 'name',
  type: 'type',
  icon: 'icon',
  color: 'color',
  parentId: 'parent_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  archivedAt: 'archived_at',
} as const;
