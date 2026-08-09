export type LaunchDestination = 'notebooks' | 'dashboard' | 'tabs';

export type NotebookEntryView = 'list' | 'dashboard';
export type NotebookEntryDestination = 'dashboard' | 'tabs';
export type TransactionsDefaultView = 'calendar' | 'list';

export type Settings = {
  id: string;
  defaultNotebookId: string | null;
  launchDestination: LaunchDestination;
  notebookEntryView: NotebookEntryView;
  notebookEntryDestination: NotebookEntryDestination;
  transactionsDefaultView: TransactionsDefaultView;
  createdAt: string;
  updatedAt: string;
};
