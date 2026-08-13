import { create } from 'zustand';

type AppState = {
  hasCompletedOnboarding: boolean;
  isSettingsPanelOpen: boolean;
  opensDefaultNotebookOnLaunch: boolean;
  selectedNotebookId: string | null;
  selectedNotebookName: string | null;
  closeSettingsPanel: () => void;
  openSettingsPanel: () => void;
  setHasCompletedOnboarding: (value: boolean) => void;
  setOpensDefaultNotebookOnLaunch: (value: boolean) => void;
  setSelectedNotebookId: (notebookId: string, notebookName?: string | null) => void;
  clearSelectedNotebookId: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  hasCompletedOnboarding: false,
  isSettingsPanelOpen: false,
  opensDefaultNotebookOnLaunch: false,
  selectedNotebookId: null,
  selectedNotebookName: null,
  closeSettingsPanel: () => set({ isSettingsPanelOpen: false }),
  openSettingsPanel: () => set({ isSettingsPanelOpen: true }),
  setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
  setOpensDefaultNotebookOnLaunch: (value) => set({ opensDefaultNotebookOnLaunch: value }),
  setSelectedNotebookId: (notebookId, notebookName = null) =>
    set({ selectedNotebookId: notebookId, selectedNotebookName: notebookName }),
  clearSelectedNotebookId: () => set({ selectedNotebookId: null, selectedNotebookName: null }),
}));
