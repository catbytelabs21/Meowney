export const SETTINGS_TABLE = 'settings';

export const settingsColumns = {
  id: 'id',
  defaultNotebookId: 'default_notebook_id',
  launchDestination: 'launch_destination',
  notebookEntryView: 'notebook_entry_view',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;
