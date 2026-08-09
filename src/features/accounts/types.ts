export type Account = {
  id: string;
  notebookId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
