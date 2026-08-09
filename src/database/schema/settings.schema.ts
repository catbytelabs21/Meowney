export const SETTINGS_TABLE = 'settings';

export const settingsColumns = {
  id: 'id',
  defaultNotebookId: 'default_notebook_id',
  launchDestination: 'launch_destination',
  notebookEntryView: 'notebook_entry_view',
  notebookEntryDestination: 'notebook_entry_destination',
  transactionsDefaultView: 'transactions_default_view',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;
