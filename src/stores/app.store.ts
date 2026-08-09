import { create } from 'zustand';

type AppState = {
  hasCompletedOnboarding: boolean;
  selectedNotebookId: string | null;
  setHasCompletedOnboarding: (value: boolean) => void;
  setSelectedNotebookId: (notebookId: string) => void;
  clearSelectedNotebookId: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  hasCompletedOnboarding: false,
  selectedNotebookId: null,
  setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
  setSelectedNotebookId: (notebookId) => set({ selectedNotebookId: notebookId }),
  clearSelectedNotebookId: () => set({ selectedNotebookId: null }),
}));
