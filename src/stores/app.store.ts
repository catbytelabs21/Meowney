import { create } from 'zustand';
import { appSettingRepository } from '@/database/repositories/app-setting.repository';

export type ThemePreference = 'system' | 'light' | 'dark';
export type LaunchPreference = 'notebooks' | 'defaultNotebook';

type AppState = {
  hasCompletedOnboarding: boolean;
  dataResetVersion: number;
  isSettingsPanelOpen: boolean;
  launchPreference: LaunchPreference;
  opensDefaultNotebookOnLaunch: boolean;
  selectedNotebookId: string | null;
  selectedNotebookName: string | null;
  themePreference: ThemePreference;
  closeSettingsPanel: () => void;
  openSettingsPanel: () => void;
  hydrateSettings: () => void;
  signalDataReset: () => void;
  setHasCompletedOnboarding: (value: boolean) => void;
  setLaunchPreference: (value: LaunchPreference) => void;
  setOpensDefaultNotebookOnLaunch: (value: boolean) => void;
  setSelectedNotebookId: (notebookId: string, notebookName?: string | null) => void;
  setThemePreference: (value: ThemePreference) => void;
  clearSelectedNotebookId: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  hasCompletedOnboarding: false,
  dataResetVersion: 0,
  isSettingsPanelOpen: false,
  launchPreference: 'notebooks',
  opensDefaultNotebookOnLaunch: false,
  selectedNotebookId: null,
  selectedNotebookName: null,
  themePreference: 'system',
  closeSettingsPanel: () => set({ isSettingsPanelOpen: false }),
  openSettingsPanel: () => set({ isSettingsPanelOpen: true }),
  hydrateSettings: () => {
    const preferences = appSettingRepository.getPreferences();

    set({
      launchPreference: preferences.launchPreference,
      opensDefaultNotebookOnLaunch: preferences.launchPreference === 'defaultNotebook',
      themePreference: preferences.themePreference,
    });
  },
  signalDataReset: () => set((state) => ({ dataResetVersion: state.dataResetVersion + 1 })),
  setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
  setLaunchPreference: (value) => {
    appSettingRepository.setLaunchPreference(value);
    set({
      launchPreference: value,
      opensDefaultNotebookOnLaunch: value === 'defaultNotebook',
    });
  },
  setOpensDefaultNotebookOnLaunch: (value) => {
    const launchPreference = value ? 'defaultNotebook' : 'notebooks';

    appSettingRepository.setLaunchPreference(launchPreference);
    set({ launchPreference, opensDefaultNotebookOnLaunch: value });
  },
  setSelectedNotebookId: (notebookId, notebookName = null) =>
    set({ selectedNotebookId: notebookId, selectedNotebookName: notebookName }),
  setThemePreference: (value) => {
    appSettingRepository.setThemePreference(value);
    set({ themePreference: value });
  },
  clearSelectedNotebookId: () => set({ selectedNotebookId: null, selectedNotebookName: null }),
}));
