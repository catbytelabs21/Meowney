export type LaunchDestination = 'notebooks' | 'dashboard' | 'tabs';

export type NotebookEntryView = 'list' | 'dashboard';

export type Settings = {
  id: string;
  defaultNotebookId: string | null;
  launchDestination: LaunchDestination;
  notebookEntryView: NotebookEntryView;
  createdAt: string;
  updatedAt: string;
};
